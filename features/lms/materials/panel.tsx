"use client";

import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { MaterialsPageClient } from "./_components/materials-page-client";

export default function MaterialsPanel() {
  return <LmsUiScope className="h-full bg-background text-foreground"><MaterialsPageClient /></LmsUiScope>;
}
