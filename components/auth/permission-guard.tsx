"use client";

import type { ReactNode } from "react";
import { WorkspaceRegion } from "@/components/workspace-region";
import { useSpace } from "@/components/desktop/space-context";
import { usePermissionStore } from "@/stores/use-permission-store";

export function usePermission() {
  const permissions = usePermissionStore(state => state.permissions);
  const isLoaded = usePermissionStore(state => state.isLoaded);
  const can = (permission: string) => isLoaded && permissions.includes(permission);
  return {
    isLoaded,
    can,
    canAny: (required: readonly string[]) => required.some(can),
    canAll: (required: readonly string[]) => isLoaded && required.every(can),
  };
}

type Props = {
  permission?: string;
  all?: readonly string[];
  any?: readonly string[];
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGuard({ permission, all, any, fallback, children }: Props) {
  const { t } = useSpace();
  const { isLoaded, can, canAll, canAny } = usePermission();
  const title = t("Quyền truy cập", "Access");
  if (!isLoaded) return fallback === undefined ? <WorkspaceRegion title={title} state="loading" /> : null;
  if ((permission && !can(permission)) || (all && !canAll(all)) || (any && !canAny(any))) {
    return fallback === undefined ? <WorkspaceRegion title={title} state="forbidden" /> : <>{fallback}</>;
  }
  return <>{children}</>;
}
