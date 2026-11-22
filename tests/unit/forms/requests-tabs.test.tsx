// ---------------------------------------------------------------------------
// app/(dashboard)/requests/_components/requests-tabs.test.tsx
// The inbox always lands on the "action" tab when the URL carries no `tab`
// query param. That fallback has to apply to BOTH the Tabs `value` and the
// per-panel content check — otherwise the selected tab reads "action" while
// NO panel renders its body, and the inbox appears empty.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { RequestsTabs } from "@/features/forms/requests/_components/requests-tabs"

function render(activeTab: string | null): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <RequestsTabs
        activeTab={activeTab}
        setActiveTab={() => {}}
        collectionId={null}
        status={null}
        keyword={null}
        archived={null}
        toolbar={<div>TOOLBAR-MARKER</div>}
        table={<div>TABLE-MARKER</div>}
      />
    </QueryClientProvider>,
  )
}

describe("RequestsTabs default tab fallback", () => {
  it("renders the action panel when the URL carries no tab", () => {
    const html = render(null)
    expect(html).toContain("TOOLBAR-MARKER")
    expect(html).toContain("TABLE-MARKER")
  })

  it("renders the action panel when the tab param is an unknown value", () => {
    const html = render("not-a-tab")
    expect(html).toContain("TABLE-MARKER")
  })

  it("renders the matching panel for an explicit tab", () => {
    const html = render("created")
    expect(html).toContain("TABLE-MARKER")
  })

  it("always renders all three tab triggers", () => {
    const html = render(null)
    expect(html).toContain("Need My Action")
    expect(html).toContain("Created by Me")
    expect(html).toContain("Viewer")
  })
})
