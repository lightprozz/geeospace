import { apiFetch } from "@/lib/api-client";
import { API_URL } from "@/lib/env";
import { configureLmsTransport } from "./transport";

export function installLmsBrowserTransport() {
  return configureLmsTransport({
    request: apiFetch,
    resolveUrl: path => `${API_URL}${path}`,
  });
}
