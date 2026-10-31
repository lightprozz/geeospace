import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import { describe, expect, it } from "vitest";
import { captureLocalSnapshot, restoreLocalSnapshot } from "@/lib/platform/local-snapshot";

describe("real local D1/R2 storage capability", () => {
  it("rolls back failed batches, enforces CAS and restores data/files into isolation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "geeospace-storage-"));
    const source = await getPlatformProxy<CloudflareEnv>({ configPath: "wrangler.jsonc", persist: { path: join(directory, "source") } });
    const destination = await getPlatformProxy<CloudflareEnv>({ configPath: "wrangler.jsonc", persist: { path: join(directory, "restored") } });
    try {
      // Snapshot before the first test-only schema change; no business data is used.
      const emptyBackup = await captureLocalSnapshot(source.env.DB, source.env.LEARNING_FILES);
      expect(emptyBackup.payload.tables).toHaveLength(0);
      await source.env.DB.exec("CREATE TABLE capability_probe (id TEXT PRIMARY KEY, value INTEGER NOT NULL, version INTEGER NOT NULL)");
      await source.env.DB.prepare("INSERT INTO capability_probe VALUES (?, ?, ?)").bind("one", 1, 1).run();
      await expect(source.env.DB.batch([
        source.env.DB.prepare("UPDATE capability_probe SET value=99 WHERE id='one'"),
        source.env.DB.prepare("INSERT INTO capability_probe VALUES ('one',2,1)")
      ])).rejects.toThrow();
      expect(await source.env.DB.prepare("SELECT value FROM capability_probe WHERE id='one'").first("value")).toBe(1);
      await source.env.DB.prepare("INSERT INTO capability_probe VALUES (?, ?, ?)").bind("two", 3, 1).run();
      const cas = source.env.DB.prepare("UPDATE capability_probe SET value=2,version=version+1 WHERE id='one' AND version=1");
      expect((await cas.run()).meta.changes).toBe(1);
      expect((await cas.run()).meta.changes).toBe(0);
      await source.env.LEARNING_FILES.put("test-only/document.txt", "owned test content", { httpMetadata: { contentType: "text/plain" }, customMetadata: { owner: "test" } });
      const snapshot = await captureLocalSnapshot(source.env.DB, source.env.LEARNING_FILES);
      const reordered = structuredClone(snapshot); reordered.payload.tables[0].rows.reverse();
      const corrupt = structuredClone(snapshot); corrupt.payload.tables[0].rows[0][1] = 999;
      await expect(restoreLocalSnapshot(destination.env.DB, destination.env.LEARNING_FILES, corrupt)).rejects.toThrow("checksum");
      await expect(restoreLocalSnapshot(destination.env.DB, destination.env.LEARNING_FILES, reordered)).resolves.toEqual({ tables: 1, objects: 1 });
      expect(await destination.env.DB.prepare("SELECT value FROM capability_probe WHERE id='one'").first("value")).toBe(2);
      expect(await (await destination.env.LEARNING_FILES.get("test-only/document.txt"))?.text()).toBe("owned test content");
      await expect(restoreLocalSnapshot(destination.env.DB, destination.env.LEARNING_FILES, snapshot)).rejects.toThrow("empty");
    } finally {
      await source.dispose(); await destination.dispose();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60000);
});
