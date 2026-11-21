"use client";

import { useMemo, type ReactNode } from "react";
import { useWindowNavigation } from "@/components/desktop/window-navigation";

export function useRouter() {
  const { navigate, back } = useWindowNavigation();
  return useMemo(() => ({ push: (path: string) => navigate(path.replace(/^\/?curriculum\/?/, "")), back }), [navigate, back]);
}

export function PanelHeader({ config }: { config: { breadcrumbs?: ReactNode; actions?: ReactNode } }) {
  return <header className="flex items-center justify-between gap-3 border-b p-3 shrink-0">{config.breadcrumbs}{config.actions}</header>;
}
