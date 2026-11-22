import { afterEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { WindowNavigationContext } from "@/components/desktop/window-navigation"
import { PERMISSIONS } from "@/lib/permissions"
import { useCan, usePermissionsLoaded } from "@/lib/use-can"
import { RequestsPanel } from "@/features/forms/requests/requests-panel"
import { FormsWindowAdapter, useRouter } from "@/features/forms/window-adapter"

vi.mock("@/lib/use-can", () => ({
  useCan: vi.fn(() => true),
  usePermissionsLoaded: vi.fn(() => true),
}))
vi.mock("@/features/forms/requests/_components/requests-page-client", () => ({
  RequestsPageClient: () => <p>INBOX-SCREEN</p>,
}))
vi.mock("@/features/forms/requests/new/_components/request-new-page-client", () => ({
  RequestNewPageClient: () => <p>NEW-SCREEN</p>,
}))
vi.mock("@/features/forms/requests/new/[templateId]/_components/request-submit-client", () => ({
  RequestSubmitClient: ({ templateId }: { templateId: string }) => <p>SUBMIT-{templateId}</p>,
}))
vi.mock("@/features/forms/requests/[id]/_components/request-detail-client", () => ({
  RequestDetailClient: ({ id }: { id: string }) => <p>DETAIL-{id}</p>,
}))

afterEach(() => {
  vi.mocked(useCan).mockClear().mockReturnValue(true)
  vi.mocked(usePermissionsLoaded).mockReturnValue(true)
})

function render(path: string) {
  return renderToStaticMarkup(
    <WindowNavigationContext.Provider value={{ path, canGoBack: false, navigate: vi.fn(), back: vi.fn() }}>
      <RequestsPanel />
    </WindowNavigationContext.Provider>,
  )
}

describe("Requests panel screens and permissions", () => {
  it.each([
    ["", "INBOX-SCREEN", PERMISSIONS.FORMS_REQUEST_READ],
    ["new", "NEW-SCREEN", PERMISSIONS.FORMS_REQUEST_WRITE],
    ["new/template-1", "SUBMIT-template-1", PERMISSIONS.FORMS_REQUEST_WRITE],
    ["request-1", "DETAIL-request-1", PERMISSIONS.FORMS_REQUEST_READ],
  ])("renders %s inside the LMS scope", (path, marker, permission) => {
    const html = render(path)
    expect(html).toContain(marker)
    expect(html).toContain("lms-ui")
    expect(useCan).toHaveBeenCalledWith(permission)
  })

  it("does not mount a screen before permissions load", () => {
    vi.mocked(usePermissionsLoaded).mockReturnValue(false)
    const html = render("")
    expect(html).toContain("Loading permissions")
    expect(html).not.toContain("INBOX-SCREEN")
  })

  it("does not mount a forbidden screen", () => {
    vi.mocked(useCan).mockReturnValue(false)
    const html = render("new")
    expect(html).toContain("You do not have permission")
    expect(html).not.toContain("NEW-SCREEN")
  })

  it("renders an unknown route without mounting a request", () => {
    expect(render("request-1/unknown")).toContain("Request page not found")
  })
})

it("uses the window navigation dispatcher for source router calls", () => {
  const navigate = vi.fn()
  let router: ReturnType<typeof useRouter> | undefined
  function Harness() {
    router = useRouter()
    return null
  }
  renderToStaticMarkup(
    <WindowNavigationContext.Provider value={{ path: "", canGoBack: false, navigate, back: vi.fn() }}>
      <FormsWindowAdapter base="/requests"><Harness /></FormsWindowAdapter>
    </WindowNavigationContext.Provider>,
  )
  router!.push("/requests/new/template-1")
  expect(navigate).toHaveBeenCalledWith("new/template-1")
  router!.push("/requests?tab=created")
  expect(navigate).toHaveBeenLastCalledWith("")
})
