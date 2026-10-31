import { writeFile } from "node:fs/promises";
import { getPlatformProxy } from "wrangler";
import { captureLocalSnapshot } from "../lib/platform/local-snapshot";

const [output, confirmation] = process.argv.slice(2);
if (!output || confirmation !== "--writers-stopped") throw new Error("Usage: npm run backup:local -- OUTPUT.json --writers-stopped (local only, stop all writers first)");
const platform = await getPlatformProxy<CloudflareEnv>({ configPath: "wrangler.jsonc", persist: { path: ".wrangler/state" } });
try {
  const snapshot = await captureLocalSnapshot(platform.env.DB, platform.env.LEARNING_FILES);
  await writeFile(output, JSON.stringify(snapshot), { flag: "wx", mode: 0o600 });
  console.log("Local D1/R2 snapshot written; checksum included. Keep the file private.");
} finally { await platform.dispose(); }
