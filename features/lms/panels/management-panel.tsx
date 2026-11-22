"use client";

import { type ReactNode } from "react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { WorkspaceRegionBoundary } from "@/components/workspace-region";
import { useSpace } from "@/components/desktop/space-context";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { useAuthStore } from "@/stores/use-auth-store";
import { UsersPageClient } from "./users/users-page-client";
import { RolesPageClient } from "./roles/roles-page-client";
import { BranchesPageClient } from "./branches/branches-page-client";

function ManagementPanel({ title, permission, children }: { title: string; permission: Permission; children: ReactNode }) {
  const identity = useAuthStore(state => state.user?.sub);
  return (
    <WorkspaceRegionBoundary title={title}>
      <PermissionGuard permission={permission}>
        <LmsUiScope key={identity} className="@container/management h-full min-h-0 bg-background text-foreground">
          {children}
        </LmsUiScope>
      </PermissionGuard>
    </WorkspaceRegionBoundary>
  );
}

export function UsersPanel() {
  const { label } = useSpace();
  return <ManagementPanel title={label("lms-users")} permission={PERMISSIONS.ADMIN_USERS_READ}><UsersPageClient /></ManagementPanel>;
}

export function RolesPanel() {
  const { label } = useSpace();
  return <ManagementPanel title={label("lms-roles")} permission={PERMISSIONS.ADMIN_ROLES_MANAGE}><RolesPageClient /></ManagementPanel>;
}

export function BranchesPanel() {
  const { label } = useSpace();
  return <ManagementPanel title={label("lms-branches")} permission={PERMISSIONS.ADMIN_FACILITIES_READ}><BranchesPageClient /></ManagementPanel>;
}
