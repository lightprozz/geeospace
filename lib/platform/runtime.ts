import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readSettings } from "@/lib/config/env";
import { ConfigurationError } from "@/lib/config/env";
import { env as variables } from "node:process";

export async function runtimeSettings() {
  if (variables.NODE_ENV === "development") {
    const settings = readSettings({ APP_ENV: variables.APP_ENV, APP_ORIGIN: variables.APP_ORIGIN });
    return { settings, capabilities: { database: false, privateFiles: false } };
  }
  const { env: bindings } = await getCloudflareContext({ async: true });
  if (!bindings.APP_ENV || !bindings.APP_ORIGIN || !bindings.DB || !bindings.LEARNING_FILES) {
    throw new ConfigurationError("WORKER_BINDINGS");
  }
  const settings = readSettings({ APP_ENV: bindings.APP_ENV, APP_ORIGIN: bindings.APP_ORIGIN });
  return { settings, capabilities: { database: true, privateFiles: true } };
}
