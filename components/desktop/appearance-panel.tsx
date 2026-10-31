import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Monitor, Moon, Sun, Film, RotateCcw } from "lucide-react";
import { accents, defaultLook, type Look } from "@/lib/desktop/appearance";
import { removeWallpaperVideo, saveWallpaperVideo } from "@/lib/desktop/wallpaper-media";
import { useSpace } from "./space-context";
export { defaultLook, lookKey, readLook, type Look } from "@/lib/desktop/appearance";

export function AppearancePanel({ look, onChange, droppedFile, onDropConsumed }: { look: Look; onChange: (look: Look | ((previous: Look) => Look)) => void; droppedFile?: File; onDropConsumed?: () => void }) {
  const { t } = useSpace();
  const image = useRef<HTMLInputElement>(null), video = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function acceptFile(file: File) {
    if (busy) { setError(t("Đang xử lý tệp trước. Hãy thử lại sau.", "A file is still being processed. Try again shortly.")); return; }
    setError("");
    if (["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 3 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = async () => {
        try { const source = String(reader.result), preview = new Image(); preview.src = source; await preview.decode(); onChange(previous => ({ ...previous, wallpaper: "image", image: source })); }
        catch { setError(t("Không đọc được ảnh. Hãy chọn lại tệp.", "Could not read the image. Choose another file.")); }
        finally { setBusy(false); }
      };
      setBusy(true);
      reader.onerror = () => { setBusy(false); setError(t("Không đọc được ảnh. Hãy chọn lại tệp.", "Could not read the image. Choose another file.")); };
      reader.readAsDataURL(file); return;
    }
    if (["video/mp4", "video/webm"].includes(file.type) && file.size <= 15 * 1024 * 1024) {
      setBusy(true);
      try { await saveWallpaperVideo(file); onChange(previous => ({ ...previous, wallpaper: "video", mediaRevision: previous.mediaRevision + 1 })); }
      catch { setError(t("Không lưu được video trên thiết bị. Hãy giải phóng dung lượng hoặc chọn ảnh.", "Could not store this video. Free device storage or choose an image.")); }
      finally { setBusy(false); }
      return;
    }
    setError(t("Chọn ảnh PNG, JPEG hoặc WebP tối đa 3 MB; video MP4 hoặc WebM tối đa 15 MB.", "Choose PNG, JPEG or WebP up to 3 MB, or MP4/WebM up to 15 MB."));
  }
  useEffect(() => {
    if (!droppedFile) return;
    const frame = requestAnimationFrame(() => { onDropConsumed?.(); void acceptFile(droppedFile); });
    return () => cancelAnimationFrame(frame);
  // A drop is consumed once; preference changes must not reimport the same file.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedFile]);
  const switches: [keyof Pick<Look, "glass" | "motion" | "companionHidden" | "companionPaused">, string, string, boolean][] = [
    ["glass", t("Hiệu ứng kính", "Glass effects"), t("Lớp điều khiển tách khỏi nội dung; tự giảm khi cần.", "Controls stay distinct from content, with accessible fallbacks."), look.glass],
    ["motion", t("Chuyển động giao diện", "Interface motion"), t("Luôn tôn trọng cài đặt giảm chuyển động của hệ thống.", "Always respects the system Reduce Motion preference."), look.motion],
    ["companionHidden", t("Hiện companion GeeO", "Show GeeO companion"), t("Trợ giúp điều hướng, có thể kéo và ẩn.", "A movable, dismissible navigation companion."), !look.companionHidden],
    ["companionPaused", t("Tạm dừng companion", "Pause companion"), t("Dừng hoạt ảnh nhân vật; các thao tác OS vẫn hoạt động.", "Pauses the character while OS interactions remain available."), look.companionPaused],
  ];
  const colourNames = { geeo: t("Gee-O", "Gee-O"), blue: t("Xanh dương", "Blue"), green: t("Xanh lá", "Green"), violet: t("Tím", "Violet"), amber: t("Hổ phách", "Amber") };
  const presets = { geeo: ["Gee-O", "Gee-O"], dusk: ["Hoàng hôn", "Dusk"], forest: ["Rừng", "Forest"], ocean: ["Đại dương", "Ocean"], aurora: ["Cực quang", "Aurora"], mono: ["Đơn sắc", "Mono"] } as const;
  return <div className="os-panel os-appearance" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && !busy) void acceptFile(file); }}>
    <p className="os-eyebrow">{t("KHÔNG GIAN THEO CÁCH CỦA BẠN", "MAKE THIS SPACE YOURS")}</p><h1>{t("Giao diện", "Appearance")}</h1><p>{t("Thay đổi cách Geeospace xuất hiện trên thiết bị này.", "Personalise Geeospace on this device.")}</p>
    <h2>{t("Chế độ màu", "Colour mode")}</h2><div className="os-theme-options">{(["light", "dark", "system"] as const).map(mode => {
      const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
      return <button disabled={busy} key={mode} aria-pressed={look.mode === mode} onClick={() => onChange({ ...look, mode })}><span className={`os-theme-preview os-theme-${mode}`}><i /><i /></span><span><Icon size={15} />{mode === "light" ? t("Sáng", "Light") : mode === "dark" ? t("Tối", "Dark") : t("Hệ thống", "System")}</span></button>;
    })}</div>
    <h2>{t("Màu nhấn SpaceOS", "SpaceOS accent")}</h2><div className="os-accent-options" role="group" aria-label={t("Màu nhấn", "Accent colour")}>{Object.entries(accents).map(([name, colour]) => <button disabled={busy} key={name} style={{ backgroundColor: colour }} aria-label={`${t("Màu", "Colour")} ${colourNames[name as keyof typeof accents]}`} aria-pressed={look.accent === name} onClick={() => onChange({ ...look, accent: name as Look["accent"] })}>{look.accent === name && <Check size={18} />}</button>)}</div><p className="os-footnote">{t("Màu nghiệp vụ và nhận diện GeeO được giữ riêng.", "Business status colours and GeeO identity stay separate.")}</p>
    <label className="os-material-setting">{t("Chất liệu điều khiển", "Control material")}<select disabled={busy} value={look.material} onChange={e => onChange({ ...look, material: e.target.value as Look["material"] })}>{(["auto", "frost", "glass", "opaque"] as const).map(value => <option key={value} value={value}>{value === "auto" ? t("Tự động", "Automatic") : value === "frost" ? t("Kính mờ", "Frosted") : value === "glass" ? t("Kính nâng cao", "Enhanced glass") : t("Đặc", "Opaque")}</option>)}</select></label>
    <h2>{t("Hình nền", "Wallpaper")}</h2><div className="os-wall-options">{Object.entries(presets).map(([wallpaper, names]) => <button disabled={busy} key={wallpaper} aria-label={`${t("Hình nền", "Wallpaper")} ${t(names[0], names[1])}`} aria-pressed={look.wallpaper === wallpaper} onClick={() => onChange({ ...look, wallpaper: wallpaper as Look["wallpaper"] })}><span className={`os-wall-preview os-wall-${wallpaper}`}>{look.wallpaper === wallpaper && <Check size={20} />}</span><span>{t(names[0], names[1])}</span></button>)}</div>
    <input ref={image} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void acceptFile(file); event.currentTarget.value = ""; }} />
    <input ref={video} type="file" accept="video/mp4,video/webm" hidden onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void acceptFile(file); event.currentTarget.value = ""; }} />
    <div className="os-media-actions"><button className="os-button os-button-secondary" disabled={busy} onClick={() => image.current?.click()}><ImagePlus size={17} />{t("Chọn ảnh từ thiết bị", "Choose image")}</button><button className="os-button os-button-secondary" disabled={busy} onClick={() => video.current?.click()}><Film size={17} />{busy ? t("Đang lưu…", "Saving…") : t("Chọn video từ thiết bị", "Choose video")}</button></div>
    <p className="os-footnote">{t("Ảnh tối đa 3 MB, video 15 MB. Có thể thả tệp vào bảng này hoặc màn hình nền. Không gửi lên máy chủ.", "Images up to 3 MB, videos up to 15 MB. Drop a file here or on the desktop. Media stays on your device.")}</p>
    {error && <p role="alert">{error}</p>}
    <label className="os-dim-setting">{t("Lớp phủ ảnh/video", "Image/video shade")} <output>{look.dim}%</output><input disabled={busy} type="range" min="0" max="80" step="1" value={look.dim} onChange={event => onChange({ ...look, dim: Number(event.target.value) })} /></label>
    {switches.map(([key, label, hint, checked]) => <div className="os-setting-row" key={key}><div><strong>{label}</strong><p>{hint}</p></div><button disabled={busy} role="switch" aria-label={label} aria-checked={checked} className="os-switch" onClick={() => onChange({ ...look, [key]: key === "companionHidden" ? checked : !checked })}><span /></button></div>)}
    <button className="os-button os-button-secondary" disabled={busy} onClick={async () => { setBusy(true); onChange(previous => ({ ...defaultLook, locale: previous.locale })); try { await removeWallpaperVideo(); setError(""); } catch { setError(t("Đã đặt lại giao diện nhưng không xóa được video cũ trên thiết bị.", "Appearance reset, but the previous video could not be removed from this device.")); } finally { setBusy(false); } }}><RotateCcw size={16} />{t("Khôi phục giao diện mặc định", "Reset appearance")}</button><p className="os-footnote">{t("Chỉ đặt lại giao diện; không đóng app hoặc xóa bố cục cửa sổ.", "Resets appearance only; keeps apps and window layout.")}</p>
  </div>;
}
