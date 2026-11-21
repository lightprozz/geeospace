"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore, watchAuthLogout } from "@/stores/use-auth-store";

export function AuthInitializer({ children }: { children?: ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);
  useEffect(() => {
    const stopWatching = watchAuthLogout();
    void initialize();
    return stopWatching;
  }, [initialize]);
  return <>{children}</>;
}
