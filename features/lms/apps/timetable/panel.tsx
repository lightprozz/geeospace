"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import type { DesktopAppId } from "@/lib/desktop/apps";
import { TimetablePageClient } from "./timetable-page-client";

export default function TimetablePanel({ onOpen }: { onOpen: (id: DesktopAppId) => void }) {
  return <LmsUiScope className="@container/lms-panel flex h-full min-h-0 flex-col bg-background text-foreground"><TimetablePageClient onOpen={onOpen} /></LmsUiScope>;
}
