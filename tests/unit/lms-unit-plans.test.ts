// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { UnitPlanPageClient } from "@/features/lms/curriculum/lessons/[lessonId]/units/_components/unit-plan-page-client";
import type { LessonDetail } from "@/features/lms/types/curriculum";

const state = vi.hoisted(() => ({ isLoading: true, isError: false }));
vi.mock("@/features/lms/hooks/curriculum/use-unit-plans", () => ({
  useUnitsByLesson: () => ({ data: undefined, ...state }),
  useReorderUnitPlans: () => ({ mutate: vi.fn() }),
  useDeleteUnitPlan: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/features/lms/curriculum/lessons/[lessonId]/units/_components/unit-upsert-dialog", () => ({ UnitUpsertDialog: () => null }));
vi.mock("@/features/lms/curriculum/lessons/[lessonId]/units/_components/category-dialog", () => ({ CategoryDialog: () => null }));
afterEach(cleanup);
describe("unit loading", () => {
  it.each([false, true])("stabilizes missing units when error=%s", (isError) => {
    state.isError = isError;
    state.isLoading = !isError;
    render(h(UnitPlanPageClient, { lessonId: "lesson-1", lesson: { lesson: "1", subject: "Numbers" } as LessonDetail }));
    expect(screen.getByText("Lesson Plan")).toBeTruthy();
    if (isError) expect(screen.getByRole("alert").textContent).toContain("Unable to load unit plans");
  });
});
