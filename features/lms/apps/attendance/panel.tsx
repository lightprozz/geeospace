"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { AttendancePageClient } from "./attendance-page-client";

export default function AttendancePanel() {
  return <LmsUiScope className="flex h-full min-h-0 flex-col bg-background text-foreground"><AttendancePageClient /></LmsUiScope>;
}
