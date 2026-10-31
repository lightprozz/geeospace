export type Place = { name: string; country: string; latitude: number; longitude: number };
export type Weather = { temperature: number; code: number; wind: number; day: boolean; observedAt: string; fetchedAt: string };
type Config = { key?: string; evaluation: boolean };
export class WeatherError extends Error { constructor(public code: "configuration" | "invalid" | "unavailable", public status: number) { super(code); } }
export function coordinates(lat: string | null, lon: string | null) {
  if (!lat?.trim() || !lon?.trim()) throw new WeatherError("invalid", 400);
  const latitude = Number(lat), longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new WeatherError("invalid", 400);
  return { latitude: Math.round(latitude * 10) / 10, longitude: Math.round(longitude * 10) / 10 };
}
const cache = new Map<string, { until: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
async function request(url: URL, config: Config): Promise<unknown> {
  if (!config.key && !config.evaluation) throw new WeatherError("configuration", 503);
  const identity = url.toString(); // Contains public query parameters only; credentials are attached afterwards.
  const hit = cache.get(identity); if (hit && hit.until > Date.now()) return hit.value;
  const existing = pending.get(identity); if (existing) return existing;
  if (pending.size >= 20) throw new WeatherError("unavailable", 503);
  if (config.key) url.searchParams.set("apikey", config.key);
  const job = (async () => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { Accept: "application/json" }, redirect: "error", cache: "no-store" });
      if (!response.ok) throw new Error("provider");
      const body: unknown = await response.json();
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(identity, { value: body, until: Date.now() + 30 * 60 * 1000 }); return body;
    } catch { throw new WeatherError("unavailable", 502); }
  })();
  pending.set(identity, job); try { return await job; } finally { pending.delete(identity); }
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
export async function findPlaces(city: string, language: string, config: Config): Promise<Place[]> {
  if (city.trim().length < 2 || city.length > 80 || !["vi", "en"].includes(language)) throw new WeatherError("invalid", 400);
  const url = new URL(`https://${config.key ? "customer-geocoding-api" : "geocoding-api"}.open-meteo.com/v1/search`);
  url.search = new URLSearchParams({ name: city.trim(), count: "5", language }).toString();
  const body = record(await request(url, config));
  if (body.results === undefined) return [];
  if (!Array.isArray(body.results)) throw new WeatherError("unavailable", 502);
  return body.results.flatMap(value => {
    const p = record(value);
    if (typeof p.name !== "string" || p.name.length > 150 || typeof p.latitude !== "number" || typeof p.longitude !== "number" || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) return [];
    return [{ name: p.name, country: typeof p.country === "string" ? p.country.slice(0, 100) : "", latitude: Math.round(p.latitude * 10) / 10, longitude: Math.round(p.longitude * 10) / 10 }];
  });
}
export async function forecast(place: { latitude: number; longitude: number }, config: Config): Promise<Weather> {
  coordinates(String(place.latitude), String(place.longitude));
  const url = new URL(`https://${config.key ? "customer-api" : "api"}.open-meteo.com/v1/forecast`);
  url.search = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current: "temperature_2m,weather_code,wind_speed_10m,is_day", timezone: "UTC" }).toString();
  const current = record(record(await request(url, config)).current);
  if (typeof current.temperature_2m !== "number" || !Number.isFinite(current.temperature_2m) || typeof current.weather_code !== "number" || !Number.isInteger(current.weather_code) || typeof current.wind_speed_10m !== "number" || !Number.isFinite(current.wind_speed_10m) || typeof current.time !== "string" || !Number.isFinite(Date.parse(`${current.time}Z`)) || ![0, 1].includes(Number(current.is_day))) throw new WeatherError("unavailable", 502);
  return { temperature: current.temperature_2m, code: current.weather_code, wind: current.wind_speed_10m, day: current.is_day === 1, observedAt: `${current.time}Z`, fetchedAt: new Date().toISOString() };
}
