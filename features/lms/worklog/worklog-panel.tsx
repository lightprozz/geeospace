"use client";

import { useWindowNavigation } from "@/components/desktop/window-navigation";
import { usePermission } from "@/components/auth/permission-guard";
import { Button } from "@/components/ui/button";
import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { PERMISSIONS } from "@/lib/permissions";
import { WorklogPageClient } from "./my-worklog/worklog-page-client";
import { TimesheetsPageClient } from "./timesheets/timesheets-page-client";

export function WorklogPanel() {
  const { path, navigate } = useWindowNavigation();
  const { isLoaded, can } = usePermission();
  const canRead = can(PERMISSIONS.WORKLOG_READ);
  const canApprove = can(PERMISSIONS.WORKLOG_APPROVE);
  const timesheets = path === "timesheets";

  return (
    <LmsUiScope className="flex h-full min-h-0 min-w-0 flex-col bg-background text-foreground">
      {(canRead || canApprove) && (
        <nav aria-label="Worklog views" className="flex shrink-0 flex-wrap gap-1 border-b px-4 py-2">
          {canRead && <Button variant={!path ? "secondary" : "ghost"} aria-current={!path ? "page" : undefined} onClick={() => { if (path) navigate(""); }}>My Worklog</Button>}
          {canApprove && <Button variant={timesheets ? "secondary" : "ghost"} aria-current={timesheets ? "page" : undefined} onClick={() => { if (!timesheets) navigate("timesheets"); }}>Timesheets</Button>}
        </nav>
      )}
      <div className="min-h-0 flex-1">
        {!isLoaded ? <p role="status" className="p-4 text-sm">Loading permissions…</p>
          : path && !timesheets ? <p className="p-4 text-sm">This Worklog view was not found.</p>
          : timesheets && canApprove ? <TimesheetsPageClient />
          : !path && canRead ? <WorklogPageClient />
          : <p className="p-4 text-sm">You don&apos;t have permission to view {timesheets ? "Timesheets" : "My Worklog"}.</p>}
      </div>
    </LmsUiScope>
  );
}
