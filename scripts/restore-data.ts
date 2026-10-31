import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import { restoreLocalSnapshot, verifySnapshot } from "../lib/platform/local-snapshot";
import { resolveRestoreDestination } from "../lib/platform/restore-destination";

const [input, destination] = process.argv.slice(2);
if (!input || !destination) throw new Error("Usage: npm run restore:local -- BACKUP.json NEW_ISOLATED_DIRECTORY");
const folder = await resolveRestoreDestination(destination, ".wrangler/state");
const snapshot = verifySnapshot(JSON.parse(await readFile(input, "utf8")));
await mkdir(folder, { mode: 0o700 });
const marker = join(folder, "restore-status.json");
await writeFile(marker, JSON.stringify({ status: "in-progress", checksum: snapshot.checksum }), { mode: 0o600 });
let platform: Awaited<ReturnType<typeof getPlatformProxy<CloudflareEnv>>> | undefined;
try {
  platform = await getPlatformProxy<CloudflareEnv>({ configPath: "wrangler.jsonc", persist: { path: folder } });
  const result = await restoreLocalSnapshot(platform.env.DB, platform.env.LEARNING_FILES, snapshot);
  await platform.dispose(); platform = undefined;
  await writeFile(marker, JSON.stringify({ status: "verified", checksum: snapshot.checksum }), { mode: 0o600 });
  console.log(`Verified local restore: ${result.tables} tables, ${result.objects} objects. Active state unchanged.`);
} catch {
  if (platform) await platform.dispose().catch(() => {});
  await writeFile(marker, JSON.stringify({ status: "failed", checksum: snapshot.checksum }), { mode: 0o600 });
  const quarantine = `${folder}.failed-${Date.now()}`;
  await rename(folder, quarantine);
  throw new Error(`Restore failed. Isolated destination quarantined at ${quarantine}; never use it as active state.`);
}
