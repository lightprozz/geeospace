"use client";
import { useCallback, useEffect, useState } from "react";

export type SourceState = "loading" | "ready" | "unconfigured" | "unauthorized" | "forbidden" | "error";
type Snapshot<T> = { url: string; status: SourceState; data: T | null; version: number };
export function useSource<T>({ url, visible, automatic = true, decode, unconfiguredCode }:
  { url: string; visible: boolean; automatic?: boolean; decode: (data: unknown) => T; unconfiguredCode: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ url, status: "loading", data: null, version: 0 });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!visible) return;
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined, active: AbortController | undefined;
    async function load() {
      const controller = new AbortController(); active = controller;
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        const status: SourceState = response.ok ? "ready" : response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : body.code === unconfiguredCode ? "unconfigured" : "error";
        const data = response.ok ? decode(body) : null;
        if (!disposed) setSnapshot(previous => ({ url, status, data, version: previous.version + 1 }));
      } catch { if (!disposed) setSnapshot(previous => ({ url, status: "error", data: null, version: previous.version + 1 })); }
      finally { clearTimeout(timeout); if (!disposed && automatic) timer = setTimeout(load, 60_000); }
    }
    void load();
    return () => { disposed = true; clearTimeout(timer); active?.abort(); };
  }, [automatic, decode, revision, unconfiguredCode, url, visible]);
  return { ...(snapshot.url === url ? snapshot : { status: "loading" as const, data: null, version: snapshot.version }), refresh };
}
