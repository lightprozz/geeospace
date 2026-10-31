import { mkdtemp, mkdir, realpath, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { resolveRestoreDestination } from "@/lib/platform/restore-destination";

it("rejects existing state and restore paths routed through symlinked active parents", async () => {
  const root = await mkdtemp(join(tmpdir(), "geeospace-restore-path-"));
  try {
    const active = join(root, "active");
    await mkdir(active);
    await symlink(active, join(root, "alias"), "dir");
    await expect(resolveRestoreDestination(join(root, "alias", "new"), active)).rejects.toThrow("outside the active state");
    await expect(resolveRestoreDestination(active, active)).rejects.toThrow("outside the active state");
    await expect(resolveRestoreDestination(root, active)).rejects.toThrow("must not exist");
    await expect(resolveRestoreDestination(join(root, "new"), active)).resolves.toBe(join(await realpath(root), "new"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
