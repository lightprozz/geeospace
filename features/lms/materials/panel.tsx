"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { MaterialsPageClient } from "./_components/materials-page-client";

export default function MaterialsPanel() {
  return <PermissionGuard permission={PERMISSIONS.CONTENT_MATERIAL_READ}><TooltipProvider><LmsUiScope className="h-full bg-background text-foreground"><MaterialsPageClient /></LmsUiScope></TooltipProvider></PermissionGuard>;
}
