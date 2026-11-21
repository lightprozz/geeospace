"use client";

import { usePermission } from "@/components/auth/permission-guard";
import { PERMISSIONS, type Permission } from "./permissions";

export function useCan(permission: Permission | readonly Permission[]) {
  const { can, canAny } = usePermission();
  return typeof permission === "string" ? can(permission) : canAny(permission);
}

export function useCanAny(permissions: readonly Permission[]) {
  return usePermission().canAny(permissions);
}

export function useCanAll(permissions: readonly Permission[]) {
  return usePermission().canAll(permissions);
}

export function usePermissionsLoaded() {
  return usePermission().isLoaded;
}

export function useCanWriteTemplates() {
  return useCan(PERMISSIONS.FORMS_TEMPLATE_WRITE);
}

export function useCanWriteRequests() {
  return useCan(PERMISSIONS.FORMS_REQUEST_WRITE);
}
