"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import type { DesktopAppId } from "@/lib/desktop/apps";
import { TimetablePageClient } from "./timetable-page-client";

export default function TimetablePanel({ onOpen }: { onOpen: (id: DesktopAppId) => void }) {
  return <LmsUiScope className="@container/lms-panel flex h-full min-h-0 flex-col bg-background text-foreground"><PermissionGuard permission={PERMISSIONS.CLASS_SCHEDULE}><TimetablePageClient onOpen={onOpen} /></PermissionGuard></LmsUiScope>;
}
