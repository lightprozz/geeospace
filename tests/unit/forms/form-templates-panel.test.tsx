import { afterEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { WindowNavigationContext } from "@/components/desktop/window-navigation"
import { FormsWindowAdapter, useParams, useRouter, useSearchParams } from "@/features/forms/window-adapter"
import { useCan, usePermissionsLoaded } from "@/lib/use-can"
import { FormTemplatesPanel } from "@/features/forms/form-templates/form-templates-panel"

vi.mock("@/lib/use-can", () => ({ useCan: vi.fn(() => true), usePermissionsLoaded: vi.fn(() => true) }))
vi.mock("@/features/forms/form-templates/_components/form-templates-page-client", () => ({
  FormTemplatesPageClient: () => <p>LIST-SCREEN</p>,
}))
vi.mock("@/features/forms/form-templates/new/page", () => ({ default: () => <p>NEW-SCREEN</p> }))
vi.mock("@/features/forms/form-templates/_components/form-template-detail-client", () => ({
  FormTemplateDetailClient: ({ id }: { id: string }) => <p>DETAIL-{id}</p>,
}))
vi.mock("@/features/forms/form-templates/_components/form-template-edit-client", () => ({
  FormTemplateEditClient: ({ id }: { id: string }) => <p>EDIT-{id}</p>,
}))
vi.mock("@/features/forms/form-templates/collections/_components/collections-page-client", () => ({
  CollectionsPageClient: () => <p>COLLECTIONS-SCREEN</p>,
}))
vi.mock("@/features/forms/form-templates/worklog-templates/_components/worklog-templates-page-client", () => ({
  WorkLogTemplatesPageClient: () => <p>WORKLOGS-SCREEN</p>,
}))
vi.mock("@/features/forms/form-templates/worklog-templates/_components/worklog-template-detail-client", () => ({
  WorkLogTemplateDetailClient: () => <p>WORKLOG-DETAIL-{useParams().id}</p>,
}))
vi.mock("@/features/forms/form-templates/worklog-templates/new/page", () => ({
  default: () => <p>WORKLOG-NEW</p>,
}))
vi.mock("@/features/forms/form-templates/worklog-templates/[id]/edit/page", () => ({
  default: function WorkLogEditScreen() { return <p>WORKLOG-EDIT-{useParams().id}</p> },
}))
vi.mock("@/features/forms/form-templates/[id]/workflow/_components/workflow-builder-client", () => ({
  WorkflowBuilderClient: ({ templateId }: { templateId: string }) => <p>WORKFLOW-{templateId}</p>,
}))
vi.mock("@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/_components/triggers-page-client", () => ({
  TriggersPageClient: ({ templateId, processId }: { templateId: string; processId: string }) => <p>TRIGGERS-{templateId}-{processId}</p>,
}))
vi.mock("@/features/forms/form-templates/[id]/api/api-preview-client", () => ({
  ApiPreviewClient: ({ templateId }: { templateId: string }) => <p>API-{templateId}</p>,
}))

afterEach(() => {
  vi.mocked(useCan).mockClear().mockReturnValue(true)
  vi.mocked(usePermissionsLoaded).mockReturnValue(true)
})

function render(path: string) {
  return renderToStaticMarkup(
    <WindowNavigationContext value={{ path, navigate: vi.fn(), back: vi.fn(), canGoBack: false }}>
      <FormTemplatesPanel />
    </WindowNavigationContext>,
  )
}

describe("Form Templates panel", () => {
  it.each([
    ["", "LIST-SCREEN"], ["new", "NEW-SCREEN"], ["collections", "COLLECTIONS-SCREEN"],
    ["t", "DETAIL-t"], ["t/edit", "EDIT-t"], ["t/workflow", "WORKFLOW-t"],
    ["t/workflow/s/triggers", "TRIGGERS-t-s"], ["t/api", "API-t"],
    ["worklog-templates", "WORKLOGS-SCREEN"], ["worklog-templates/new", "WORKLOG-NEW"],
    ["worklog-templates/w", "WORKLOG-DETAIL-w"], ["worklog-templates/w/edit", "WORKLOG-EDIT-w"],
  ])("renders %s in the LMS scope", (path, marker) => {
    const html = render(path)
    expect(html).toContain(marker)
    expect(html).toContain("lms-ui")
    expect(html).toContain('data-forms-window="/form-templates"')
  })
  it("does not mount a screen before permissions load", () => {
    vi.mocked(usePermissionsLoaded).mockReturnValue(false)
    const html = render("")
    expect(html).toContain("Loading permissions")
    expect(html).not.toContain("LIST-SCREEN")
  })
  it("does not mount a forbidden screen", () => {
    vi.mocked(useCan).mockReturnValue(false)
    const html = render("new")
    expect(html).toContain("You do not have permission")
    expect(html).not.toContain("NEW-SCREEN")
  })
  it("renders not-found without mounting a template", () => {
    expect(render("t/nope")).toContain("Form template page not found")
  })
})

it("adapts source params, search and router without changing the browser URL", () => {
  const navigate = vi.fn()
  const back = vi.fn()
  let router: ReturnType<typeof useRouter> | undefined
  function Harness() {
    router = useRouter()
    return <p>{useParams().id}:{useSearchParams().get("keyword")}</p>
  }
  const html = renderToStaticMarkup(
    <WindowNavigationContext value={{ path: "worklog-templates/w/edit?keyword=demo", navigate, back, canGoBack: true }}>
      <FormsWindowAdapter base="/form-templates" params={{ id: "w" }}><Harness /></FormsWindowAdapter>
    </WindowNavigationContext>,
  )
  expect(html).toContain("w:demo")
  router!.replace("/form-templates/worklog-templates/w/edit?keyword=search")
  expect(navigate).not.toHaveBeenCalled()
  router!.push("/form-templates/t/workflow")
  expect(navigate).toHaveBeenCalledWith("t/workflow")
  router!.back()
  expect(back).toHaveBeenCalledOnce()
  expect(() => router!.push("/requests")).toThrow("Cannot navigate outside this forms window")
})
