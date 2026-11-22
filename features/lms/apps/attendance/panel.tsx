"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { AttendancePageClient } from "./attendance-page-client";

export default function AttendancePanel() {
  return <LmsUiScope className="@container/lms-panel flex h-full min-h-0 flex-col bg-background text-foreground"><PermissionGuard permission={PERMISSIONS.ATTENDANCE_CATCHUP_READ}><AttendancePageClient /></PermissionGuard></LmsUiScope>;
}
