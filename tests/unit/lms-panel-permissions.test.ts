// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpaceContext } from "@/components/desktop/space-context";
import { WindowNavigationContext } from "@/components/desktop/window-navigation";
import CurriculumPanel from "@/features/lms/curriculum/panel";
import MaterialsPanel from "@/features/lms/materials/panel";
import { configureLmsTransport, type LmsRequestOptions } from "@/features/lms/lib/transport";
import { PERMISSIONS } from "@/lib/permissions";
import { usePermissionStore } from "@/stores/use-permission-store";

let request = vi.fn<(path: string, options?: LmsRequestOptions) => Promise<unknown>>();
let dispose: () => void;
let client: QueryClient;

function mount(Panel: typeof CurriculumPanel, path = "") {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(h(SpaceContext, { value: "en" },
    h(QueryClientProvider, { client },
      h(WindowNavigationContext, { value: { path, canGoBack: false, navigate: vi.fn(), back: vi.fn() } }, h(Panel)))));
}

beforeEach(() => {
  usePermissionStore.setState({ isLoaded: true, permissions: [PERMISSIONS.CURRICULUM_CREATE, PERMISSIONS.CONTENT_MATERIAL_WRITE] });
  request = vi.fn(async (path: string) => path.endsWith("/query")
    ? { items: [{ id: "material-1", name: "Counting resource", materialFormat: 3, materialCategories: "Math", approved: true }], total: 1, page: 1, pageSize: 20, hasNext: false }
    : [{ id: "level-1", name: "Explorers", numberOfLesson: 12, lessonPlanCount: 1 }]);
  dispose = configureLmsTransport({ request: async <T>(path: string, options?: LmsRequestOptions) => await request(path, options) as T, resolveUrl: path => path });
});

afterEach(() => {
  cleanup();
  client.clear();
  dispose();
  usePermissionStore.setState({ permissions: [], isLoaded: false });
});

describe("curriculum panel read guard", () => {
  it.each(["", "lessons/lesson-1/units", "lessons/lesson-1/content", "levels/level-1/exam"])("denies route %s before any data request", async (path) => {
    mount(CurriculumPanel, path);
    await screen.findByText("You do not have permission to view this content.");
    expect(request).not.toHaveBeenCalled();
  });

  it("renders curriculum with only curriculum.read", async () => {
    usePermissionStore.setState({ permissions: [PERMISSIONS.CURRICULUM_READ] });
    mount(CurriculumPanel);
    await screen.findByText("Explorers");
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/levels$/), { method: "GET" });
  });
});

describe("materials panel read guard", () => {
  it("denies access before any data request even with write permission", async () => {
    mount(MaterialsPanel);
    await screen.findByText("You do not have permission to view this content.");
    expect(request).not.toHaveBeenCalled();
  });

  it("renders materials with only content.material.read", async () => {
    usePermissionStore.setState({ permissions: [PERMISSIONS.CONTENT_MATERIAL_READ] });
    mount(MaterialsPanel);
    await screen.findByText("Counting resource");
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/Materials\/query$/), expect.objectContaining({ method: "POST" }));
  });
});

it.each([CurriculumPanel, MaterialsPanel])("waits for permission hydration without making data requests", async (Panel) => {
  usePermissionStore.setState({ isLoaded: false, permissions: [PERMISSIONS.CURRICULUM_READ, PERMISSIONS.CONTENT_MATERIAL_READ] });
  mount(Panel);
  await screen.findByText("Loading data…");
  expect(request).not.toHaveBeenCalled();
});
