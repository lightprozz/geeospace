"use client";

import { useWindowNavigation } from "@/components/desktop/window-navigation";
import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { useLessonById } from "@/features/lms/hooks/curriculum/use-lesson-plans";
import { useStudyLevel } from "@/features/lms/hooks/curriculum/use-study-levels";
import { useDeletedLessons, useLessonContent } from "@/features/lms/hooks/curriculum/use-lesson-content";
import { useExamForms } from "@/features/lms/hooks/curriculum/use-exam-forms";
import { CurriculumPageClient } from "./_components/curriculum-page-client";
import { UnitPlanPageClient } from "./lessons/[lessonId]/units/_components/unit-plan-page-client";
import { LessonContentClient } from "./lessons/[lessonId]/content/_components/lesson-content-client";
import { ExamFrameClient } from "./levels/[levelId]/exam/_components/exam-frame-client";

function LessonPanel({ id, tab }: { id: string; tab: string }) {
  const lesson = useLessonById(id);
  const content = useLessonContent(tab === "content" ? id : "");
  const versions = useDeletedLessons(tab === "content" ? id : "");
  const { navigate } = useWindowNavigation();
  if (lesson.isError || content.isError || versions.isError) return <p role="alert">Unable to load lesson. Please try again.</p>;
  if (!lesson.data || (tab === "content" && (content.isPending || versions.isPending))) return <p role="status">Loading lesson…</p>;
  return <><nav className="flex gap-4 border-b p-3"><button onClick={() => navigate("")}>Curriculum</button><button onClick={() => navigate(`lessons/${id}/units`)}>Units</button><button onClick={() => navigate(`lessons/${id}/content`)}>Content</button></nav><div className="flex-1 min-h-0 overflow-auto">{tab === "content" ? <LessonContentClient key={id} lessonId={id} lesson={lesson.data} initialContent={content.data ?? null} oldVersions={versions.data ?? []} /> : <UnitPlanPageClient key={id} lessonId={id} lesson={lesson.data} />}</div></>;
}

function ExamPanel({ id }: { id: string }) {
  const level = useStudyLevel(id);
  const forms = useExamForms(id);
  if (level.isError || forms.isError) return <p role="alert">Unable to load exam templates.</p>;
  if (!level.data || forms.isPending) return <p role="status">Loading exam templates…</p>;
  return <ExamFrameClient key={id} levelId={id} level={level.data} />;
}

export default function CurriculumPanel() {
  const { path } = useWindowNavigation();
  const parts = path.replace(/^\//, "").split("/");
  return <LmsUiScope className="h-full flex flex-col bg-background text-foreground overflow-auto">{!parts[0] ? <CurriculumPageClient /> : parts[0] === "lessons" && parts[1] && ["units", "content"].includes(parts[2]) ? <LessonPanel id={parts[1]} tab={parts[2]} /> : parts[0] === "levels" && parts[1] && parts[2] === "exam" ? <ExamPanel id={parts[1]} /> : <p role="alert">Curriculum page not found.</p>}</LmsUiScope>;
}
