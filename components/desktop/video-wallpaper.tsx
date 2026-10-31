import { useEffect, useRef, useState } from "react";
import { loadWallpaperVideo } from "@/lib/desktop/wallpaper-media";
export function VideoWallpaper({ revision, moving, onError }: { revision: number; moving: boolean; onError: () => void }) {
  const [url, setUrl] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const error = useRef(onError);
  useEffect(() => { error.current = onError; }, [onError]);
  useEffect(() => {
    let cancelled = false, objectUrl = "";
    loadWallpaperVideo().then(blob => {
      if (cancelled) return;
      if (!blob) { error.current(); return; }
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }, () => { if (!cancelled) error.current(); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [revision]);
  useEffect(() => {
    const el = video.current;
    if (!el || !url) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (!moving || media.matches || document.hidden) el.pause(); else el.play().catch(() => {}); };
    update(); media.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => { el.pause(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, [moving, url]);
  return url ? <video ref={video} src={url} loop muted playsInline aria-hidden="true" onError={onError} /> : null;
}
