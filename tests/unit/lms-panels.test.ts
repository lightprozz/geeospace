// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { configureLmsTransport } from "@/features/lms/lib/transport";
import { usePermissionStore } from "@/stores/use-permission-store";
import { useCurriculumStore } from "@/features/lms/stores/use-curriculum-store";
import { LevelList } from "@/features/lms/curriculum/_components/level-list";
import { LessonUpsertDialog } from "@/features/lms/curriculum/_components/lesson-upsert-dialog";
import { MaterialsPageClient } from "@/features/lms/materials/_components/materials-page-client";
import { MaterialPreviewDialog } from "@/features/lms/materials/_components/material-preview-dialog";

const level = { id: "level-1", name: "Explorers", numberOfLesson: 12, lessonPlanCount: 1 };
const material = { id: "material-1", name: "Counting video", materialFormat: 4, materialFormatText: "Video", materialCategories: "Math", approved: true, url: "https://www.youtube.com/watch?v=abc", fileName: null };
let request = vi.fn();
let dispose: () => void;
function mount(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(h(QueryClientProvider, { client }, h(LmsUiScope, {}, node)));
}
beforeEach(() => {
  usePermissionStore.setState({ isLoaded: true, permissions: ["curriculum.create", "content.material.write"] });
  request = vi.fn(async (path: string) => path.includes("check-exists") ? { exists: false, exceedsMaxLessons: false, hasTeachingLog: false } : path.endsWith("/query") ? { items: [material], total: 1, page: 1, pageSize: 20, hasNext: false } : [level]);
  dispose = configureLmsTransport({ request: (path, options) => request(path, options), resolveUrl: path => path });
  useCurriculumStore.getState().closeLesson();
});
afterEach(() => { cleanup(); dispose(); });

describe("curriculum", () => {
  it.each([
    [{ exists: false, exceedsMaxLessons: false, hasTeachingLog: true }, false],
    [{ exists: true, exceedsMaxLessons: false, hasTeachingLog: false }, true],
    [{ exists: false, exceedsMaxLessons: true, hasTeachingLog: false }, true],
  ])("checks lesson conflict flags %j", async (result, conflict) => {
    request.mockResolvedValue(result);
    useCurriculumStore.getState().openCreateLesson();
    mount(h(LessonUpsertDialog, { levelId: "level-1" }));
    fireEvent.change(screen.getByLabelText(/Lesson Number/), { target: { value: "2" } });
    fireEvent.blur(screen.getByLabelText(/Lesson Number/));
    await waitFor(() => expect(request).toHaveBeenCalled());
    await waitFor(() => expect(Boolean(screen.queryByText("Lesson number already exists or exceeds the level limit"))).toBe(conflict));
  });
  it("renders levels and filters to an empty state", async () => {
    mount(h(LevelList, { selectedLevelId: "", onSelectLevel: vi.fn(), onDeleteLevel: vi.fn() }));
    expect(await screen.findByText("Explorers")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Filter levels..."), { target: { value: "missing" } });
    expect(screen.getByText("No levels match filter")).toBeTruthy();
  });
  it("shows an empty level collection", async () => {
    request.mockResolvedValue([]);
    mount(h(LevelList, { selectedLevelId: "", onSelectLevel: vi.fn(), onDeleteLevel: vi.fn() }));
    expect(await screen.findByText("No levels yet")).toBeTruthy();
  });
  it("reports level load errors", async () => {
    request.mockRejectedValue(new Error("offline"));
    mount(h(LevelList, { selectedLevelId: "", onSelectLevel: vi.fn(), onDeleteLevel: vi.fn() }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unable to load study levels.");
  });
  it("submits a new lesson and closes the dialog", async () => {
    useCurriculumStore.getState().openCreateLesson();
    mount(h(LessonUpsertDialog, { levelId: "level-1" }));
    fireEvent.change(screen.getByLabelText(/Lesson Number/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: "Numbers" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Lesson" }));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/lessons$/), expect.objectContaining({ method: "POST", body: expect.objectContaining({ lesson: "2", subject: "Numbers", levelId: "level-1" }) })));
    await waitFor(() => expect(useCurriculumStore.getState().lessonDialog.open).toBe(false));
  });
  it("validates empty lessons without submitting", async () => {
    useCurriculumStore.getState().openCreateLesson();
    mount(h(LessonUpsertDialog, { levelId: "level-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Lesson" }));
    await waitFor(() => expect(screen.getByLabelText(/Lesson Number/).getAttribute("aria-invalid")).toBe("true"));
    expect(request).not.toHaveBeenCalled();
  });
  it("keeps the lesson dialog open after a failed save", async () => {
    request.mockRejectedValue(new Error("offline"));
    useCurriculumStore.getState().openCreateLesson();
    mount(h(LessonUpsertDialog, { levelId: "level-1" }));
    fireEvent.change(screen.getByLabelText(/Lesson Number/), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: "Numbers" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Lesson" }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(useCurriculumStore.getState().lessonDialog.open).toBe(true);
  });
});

describe("materials", () => {
  it("cycles sorting ascending, descending, then unsorted", async () => {
    localStorage.removeItem("materials-table-sort");
    mount(h(MaterialsPageClient));
    await screen.findByText("Counting video");
    fireEvent.click(await screen.findByRole("columnheader", { name: "Name" }));
    expect(JSON.parse(localStorage.getItem("materials-table-sort")!)).toEqual({ field: "name", desc: false });
    await screen.findByText("Counting video");
    fireEvent.click(await screen.findByRole("columnheader", { name: "Name" }));
    expect(JSON.parse(localStorage.getItem("materials-table-sort")!)).toEqual({ field: "name", desc: true });
    await screen.findByText("Counting video");
    fireEvent.click(await screen.findByRole("columnheader", { name: "Name" }));
    expect(localStorage.getItem("materials-table-sort")).toBeNull();
  });
  it("renders an empty library", async () => {
    request.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasNext: false });
    mount(h(MaterialsPageClient));
    expect(await screen.findByText("No materials found")).toBeTruthy();
  });
  it("explains when a preview has no source", () => {
    mount(h(MaterialPreviewDialog, { open: true, material: { ...material, url: null } as never, onClose: vi.fn() }));
    expect(screen.getByText("Preview not available")).toBeTruthy();
  });
  it("queries category filters and opens preview", async () => {
    mount(h(MaterialsPageClient));
    fireEvent.click(await screen.findByText("Counting video"));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTitle("Preview: Counting video")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Categories" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Math" }));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/query$/), expect.objectContaining({ body: expect.objectContaining({ filters: expect.objectContaining({ filters: expect.arrayContaining([expect.objectContaining({ field: "materialCategories", value: "math" })]) }) }) })));
  });
  it("reports material query errors", async () => {
    request.mockRejectedValue(new Error("offline"));
    mount(h(MaterialsPageClient));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unable to load materials.");
  });
});
