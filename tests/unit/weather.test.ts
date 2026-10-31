import { afterEach, expect, it, vi } from "vitest";
import { coordinates, findPlaces, forecast } from "@/lib/weather/provider";
afterEach(() => vi.unstubAllGlobals());
it("rejects missing or out-of-range locations and coarsens accepted coordinates", () => {
  for (const [a,b] of [[null,"2"],["","2"],["NaN","2"],["91","0"],["1","181"]]) expect(() => coordinates(a,b)).toThrow("invalid");
  expect(coordinates("10.7769", "106.7009")).toEqual({ latitude: 10.8, longitude: 106.7 });
});
it("does not call a free evaluation endpoint in production without provider configuration", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await expect(findPlaces("London", "en", { evaluation: false })).rejects.toMatchObject({ code: "configuration", status: 503 });
  expect(fetch).not.toHaveBeenCalled();
});
it("validates provider results, coalesces requests and keeps credentials server-side", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ results: [{ name: "City", country: "VN", latitude: 10.776, longitude: 106.701 }, { name: "invalid", latitude: 999, longitude: 1 }] })); vi.stubGlobal("fetch", fetch);
  const config = { evaluation: false, key: "isolated-test-key" };
  const [a,b] = await Promise.all([findPlaces("Example unique", "vi", config), findPlaces("Example unique", "vi", config)]);
  expect(a).toEqual(b); expect(a).toEqual([{ name: "City", country: "VN", latitude: 10.8, longitude: 106.7 }]); expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0]; expect(url.hostname).toBe("customer-geocoding-api.open-meteo.com"); expect(options.redirect).toBe("error"); expect(options.signal).toBeInstanceOf(AbortSignal); expect(JSON.stringify(a)).not.toContain("isolated-test-key");
});
it("rejects malformed forecasts and sanitizes network errors containing credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ current: { temperature_2m: "warm" } })));
  await expect(forecast({ latitude: 20, longitude: 22 }, { evaluation: true })).rejects.toMatchObject({ code: "unavailable" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret-url-key")));
  await expect(findPlaces("Unique network failure", "en", { evaluation: true })).rejects.toMatchObject({ message: "unavailable" });
});
it("preserves the real observation time independently of refresh time", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ current: { temperature_2m: 28, weather_code: 3, wind_speed_10m: 5, is_day: 1, time: "2026-10-31T04:00" } })));
  expect(await forecast({ latitude: 10, longitude: 101 }, { evaluation: true })).toMatchObject({ temperature: 28, observedAt: "2026-10-31T04:00Z", day: true });
});
