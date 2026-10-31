export type AppSettings = {
  origin: string;
  environment: "development" | "staging" | "production";
  auth: { status: "unconfigured" | "configured"; issuer?: string; clientId?: string };
};

export class ConfigurationError extends Error {
  constructor(public readonly field: string) {
    super(`Invalid server configuration: ${field}`);
    this.name = "ConfigurationError";
  }
}

function trustedUrl(value: string, field: string, development: boolean): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new ConfigurationError(field); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.hash || url.search ||
      (url.protocol !== "https:" && !(development && local && url.protocol === "http:"))) {
    throw new ConfigurationError(field);
  }
  return url.href.replace(/\/$/, "");
}

export function readSettings(values: Record<string, string | undefined>): AppSettings {
  const environment = values.APP_ENV ?? "development";
  if (!["development", "staging", "production"].includes(environment)) throw new ConfigurationError("APP_ENV");
  const development = environment === "development";
  if (!development && !values.APP_ORIGIN) throw new ConfigurationError("APP_ORIGIN");
  const origin = trustedUrl(values.APP_ORIGIN ?? "http://127.0.0.1:3100", "APP_ORIGIN", development);
  if (new URL(origin).pathname !== "/") throw new ConfigurationError("APP_ORIGIN");
  const issuer = values.GEEO_AUTH_ISSUER;
  const clientId = values.GEEO_AUTH_CLIENT_ID;
  if (Boolean(issuer) !== Boolean(clientId)) throw new ConfigurationError("GEEO_AUTH");
  return {
    origin,
    environment: environment as AppSettings["environment"],
    auth: issuer && clientId
      ? { status: "configured", issuer: trustedUrl(issuer, "GEEO_AUTH_ISSUER", development), clientId }
      : { status: "unconfigured" }
  };
}
