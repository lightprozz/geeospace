"use client";
import { useSyncExternalStore } from "react";
import { notificationsOrigin } from "@/lib/desktop/app-status";

const subscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function useNotificationsOrigin() {
  const host = useSyncExternalStore(subscribe, browserOrigin, serverOrigin);
  const origin = notificationsOrigin();
  // Do not mount a same-origin shell recursively when an origin is misconfigured.
  return host && origin !== host ? origin : undefined;
}
