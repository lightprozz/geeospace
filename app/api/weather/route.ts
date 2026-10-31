import { getCloudflareContext } from "@opennextjs/cloudflare";
import { env } from "node:process";
import { coordinates, findPlaces, forecast, WeatherError } from "@/lib/weather/provider";
export async function GET(request: Request) {
  try {
    let config: { key?: string; evaluation: boolean };
    if (env.NODE_ENV === "development") config = { key: env.WEATHER_API_KEY, evaluation: true };
    else {
      const { env: bindings } = await getCloudflareContext({ async: true });
      config = { key: (bindings as typeof bindings & { WEATHER_API_KEY?: string }).WEATHER_API_KEY, evaluation: bindings.APP_ENV === "development" };
    }
    const query = new URL(request.url).searchParams;
    const result = query.get("mode") === "search" ? { places: await findPlaces(query.get("city") ?? "", query.get("locale") ?? "vi", config) } : query.get("mode") === "forecast" ? { weather: await forecast(coordinates(query.get("lat"), query.get("lon")), config) } : undefined;
    if (!result) throw new WeatherError("invalid", 400);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof WeatherError;
    return Response.json({ error: known ? error.code : "unavailable" }, { status: known ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
