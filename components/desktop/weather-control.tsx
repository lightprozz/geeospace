import { useEffect, useRef, useState } from "react";
import { CloudSun, LocateFixed, RefreshCw, X } from "lucide-react";
import type { Place, Weather } from "@/lib/weather/provider";
import { useSpace } from "./space-context";
const key = "geeospace.weather.place.v1";
export function WeatherControl() {
  const { t, locale } = useSpace();
  const [open, setOpen] = useState(false), [place, setPlace] = useState<Place | null>(null), [weather, setWeather] = useState<Weather | null>(null);
  const [city, setCity] = useState(""), [places, setPlaces] = useState<Place[]>([]), [status, setStatus] = useState("off"), [refresh, setRefresh] = useState(0);
  const anchor = useRef<HTMLDivElement>(null), request = useRef<AbortController | null>(null), sequence = useRef(0), geoSequence = useRef(0), button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { try { const value = JSON.parse(localStorage.getItem(key) ?? "null"); if (value && typeof value.name === "string" && value.name.length <= 150 && typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 && typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180) setPlace(value); } catch { /* Optional device preference. */ } });
    const invalidate = () => { geoSequence.current++; };
    return () => { cancelAnimationFrame(frame); request.current?.abort(); invalidate(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => anchor.current?.querySelector<HTMLInputElement>("input")?.focus());
    const outside = (e: PointerEvent) => { if (!anchor.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  useEffect(() => {
    if (!place) return;
    let alive = true;
    async function load() {
      if (!navigator.onLine) { setStatus("offline"); return; }
      if (document.hidden) return;
      request.current?.abort(); const control = new AbortController(); request.current = control; const id = ++sequence.current;
      setStatus("loading");
      try { const response = await fetch(`/api/weather?mode=forecast&lat=${place!.latitude}&lon=${place!.longitude}`, { signal: control.signal }); const result = await response.json() as { error?: string; weather?: Weather }; if (alive && id === sequence.current) { if (!response.ok) setStatus(result.error ?? "error"); else if (result.weather && Number.isFinite(result.weather.temperature) && Number.isFinite(Date.parse(result.weather.observedAt))) { setWeather(result.weather); setStatus(Date.now() - Date.parse(result.weather.observedAt) > 60 * 60 * 1000 ? "stale" : "ready"); } else setStatus("error"); } }
      catch { if (alive && !control.signal.aborted) setStatus(navigator.onLine ? "error" : "offline"); }
    }
    void load(); const timer = setInterval(load, 30 * 60 * 1000);
    const visible = () => { if (!document.hidden) void load(); }, offline = () => setStatus("offline");
    window.addEventListener("online", load); window.addEventListener("offline", offline); document.addEventListener("visibilitychange", visible);
    return () => { alive = false; clearInterval(timer); request.current?.abort(); window.removeEventListener("online", load); window.removeEventListener("offline", offline); document.removeEventListener("visibilitychange", visible); };
  }, [place, refresh]);
  function choose(value: Place) { geoSequence.current++; sequence.current++; request.current?.abort(); setWeather(null); setPlace(value); setPlaces([]); try { localStorage.setItem(key, JSON.stringify(value)); } catch { setStatus("storage"); } }
  async function search() {
    geoSequence.current++; request.current?.abort(); const control = new AbortController(); request.current = control; const id = ++sequence.current;
    setStatus("loading"); setPlaces([]);
    try { const response = await fetch(`/api/weather?mode=search&city=${encodeURIComponent(city)}&locale=${locale}`, { signal: control.signal }); const result = await response.json() as { error?: string; places?: Place[] }; if (id !== sequence.current) return; if (!response.ok) setStatus(result.error ?? "error"); else if (Array.isArray(result.places)) { setPlaces(result.places); setStatus(result.places.length ? "choose" : "not-found"); } else setStatus("error"); }
    catch { if (!control.signal.aborted) setStatus(navigator.onLine ? "error" : "offline"); }
  }
  const summary = weather ? weather.code < 3 ? t("Trời quang", "Clear skies") : weather.code < 50 ? t("Nhiều mây / sương", "Cloud / fog") : weather.code < 70 ? t("Mưa", "Rain") : weather.code < 80 ? t("Tuyết", "Snow") : t("Mưa rào / giông", "Showers / storm") : "";
  const messages: Record<string, string> = { stale: t("Nguồn đang cung cấp quan trắc cũ.", "The provider is returning an older observation."), off: t("Thời tiết đang tắt. Chọn thành phố để bật.", "Weather is off. Choose a city to enable it."), loading: t("Đang tải…", "Loading…"), offline: t("Bạn đang ngoại tuyến.", "You are offline."), denied: t("Không lấy được vị trí. Hãy nhập thành phố.", "Location unavailable. Enter a city instead."), "not-found": t("Không tìm thấy thành phố.", "No matching city."), configuration: t("Chưa cấu hình dịch vụ thời tiết cho môi trường này.", "Weather service is not configured for this environment."), invalid: t("Nhập tên thành phố từ 2 đến 80 ký tự.", "Enter a city name with 2–80 characters."), error: t("Không tải được thời tiết. Hãy thử lại.", "Could not load weather. Try again."), unavailable: t("Nguồn thời tiết tạm thời không sẵn sàng.", "Weather provider is temporarily unavailable."), storage: t("Không lưu được thành phố trên thiết bị.", "Could not save the city on this device."), "storage-off": t("Đã tắt trong phiên này nhưng không xóa được địa điểm đã lưu. Hãy kiểm tra quyền lưu trữ của trình duyệt.", "Turned off for this session, but the saved location could not be removed. Check browser storage permissions.") };
  return <div ref={anchor} className="os-weather" onKeyDown={e => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); button.current?.focus(); } }}><button ref={button} aria-label={t("Thời tiết", "Weather")} aria-expanded={open} onClick={() => setOpen(!open)}><CloudSun size={17} /><span>{weather ? `${Math.round(weather.temperature)}°` : t("Thời tiết", "Weather")}</span></button>{open && <section className="os-weather-popover" aria-label={t("Cài đặt thời tiết", "Weather settings")}><div className="os-widget-heading"><strong>{t("Thời tiết", "Weather")}</strong><button aria-label={t("Đóng thời tiết", "Close weather")} onClick={() => { setOpen(false); button.current?.focus(); }}><X size={16} /></button></div><p>{t("Chỉ dùng thành phố hoặc vị trí gần đúng, không liên kết tài khoản Gee-O.", "Uses a city or approximate location, separate from your Gee-O account.")}</p><form onSubmit={e => { e.preventDefault(); void search(); }}><input aria-label={t("Thành phố", "City")} placeholder={t("Nhập thành phố", "Enter a city")} minLength={2} maxLength={80} required value={city} onChange={e => setCity(e.target.value)} /><button type="submit">{t("Tìm", "Search")}</button></form><button onClick={() => {
    const id = ++geoSequence.current; setStatus("loading"); if (!navigator.geolocation) { setStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(value => { if (id === geoSequence.current) choose({ name: t("Gần đây", "Nearby"), country: "", latitude: Math.round(value.coords.latitude * 10) / 10, longitude: Math.round(value.coords.longitude * 10) / 10 }); }, () => { if (id === geoSequence.current) setStatus("denied"); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 1800000 });
  }}><LocateFixed size={15} />{t("Dùng vị trí gần đúng", "Use approximate location")}</button><div className="os-weather-results">{places.map((p, i) => <button key={i} onClick={() => choose(p)}>{p.name}, {p.country}</button>)}</div><div role="status">{messages[status]}{weather && <><h3>{place?.name} · {Math.round(weather.temperature)}°C</h3><p>{summary} · {weather.wind} km/h</p><small>{t("Quan trắc", "Observed")} {new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(weather.observedAt))}{status !== "ready" && ` · ${t("Dữ liệu cũ", "Previous reading")}`}</small></>}</div>{place && <div className="os-weather-actions"><button onClick={() => setRefresh(v => v + 1)}><RefreshCw size={14} />{t("Làm mới", "Refresh")}</button><button onClick={() => { geoSequence.current++; sequence.current++; request.current?.abort(); setPlace(null); setWeather(null); setPlaces([]); setStatus("off"); try { localStorage.removeItem(key); } catch { setStatus("storage-off"); } }}>{t("Tắt thời tiết", "Turn off")}</button></div>}<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo ↗</a></section>}</div>;
}
