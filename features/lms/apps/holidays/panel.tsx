"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { HolidaysPageClient } from "./holidays-page-client";

export default function HolidaysPanel() {
  return <LmsUiScope className="@container/lms-panel flex h-full min-h-0 flex-col bg-background text-foreground"><HolidaysPageClient /></LmsUiScope>;
}
