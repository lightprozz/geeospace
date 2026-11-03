"use client";
import { useEffect, useRef } from "react";
import { useSpaceOS } from "@geeo/embedded-app/bridge";
import { useSource } from "@geeo/embedded-app/use-source";
type Summary = { count: number; observedAt: string };
function decode(data: unknown): Summary {
  const value = data as Summary;
  if (!value || !Number.isSafeInteger(value.count) || value.count < 0 || value.count > 5000 || typeof value.observedAt !== "string" || !Number.isFinite(Date.parse(value.observedAt))) throw new Error("Invalid summary");
  return { count: value.count, observedAt: value.observedAt };
}
export function StatusChannel() {
  const { visible, embedded, send } = useSpaceOS();
  const sequence = useRef(0);
  const source = useSource({ url: "/api/status", visible: visible && embedded, decode, unconfiguredCode: "NOTIFICATIONS_NOT_CONFIGURED" });
  useEffect(() => {
    if (!visible || source.status === "loading") return;
    send({ type: "spaceos:app-status", appId: "notifications", sequence: ++sequence.current,
      status: source.status, count: source.data?.count ?? null, observedAt: source.data?.observedAt ?? null });
  }, [send, source.data, source.status, source.version, visible]);
  return null;
}
