"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DesktopAppId } from "@/lib/desktop/apps";
import { SchedulePageClient } from "./schedule-page-client";

export default function SchedulePanel({ onOpen }: { onOpen: (id: DesktopAppId) => void }) {
  return <LmsUiScope className="flex h-full min-h-0 flex-col bg-background text-foreground"><TooltipProvider><SchedulePageClient onOpen={onOpen} /></TooltipProvider></LmsUiScope>;
}
