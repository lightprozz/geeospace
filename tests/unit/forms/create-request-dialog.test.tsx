// ---------------------------------------------------------------------------
// app/(dashboard)/requests/_components/create-request-dialog.test.tsx
// R-C2: the available-templates query must be disabled while the dialog is
// closed, so opening the inbox does not fetch a template list nobody sees.
// ---------------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const useAvailableTemplates = vi.fn(
  (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _collectionId?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: { enabled?: boolean },
  ) => ({
    data: [] as { id: string; name: string }[],
    isLoading: false,
  }),
)

vi.mock("@/features/forms/window-adapter", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/features/lms/hooks/requests/use-available-templates", () => ({
  useAvailableTemplates: (collectionId?: string, options?: { enabled?: boolean }) =>
    useAvailableTemplates(collectionId, options),
}))

import { CreateRequestDialog } from "@/features/forms/requests/_components/create-request-dialog"

function render(open: boolean): string {
  return renderToStaticMarkup(
    <CreateRequestDialog
      open={open}
      onOpenChange={() => {}}
      collectionId={null}
    />,
  )
}

describe("CreateRequestDialog template query gating", () => {
  beforeEach(() => {
    useAvailableTemplates.mockClear()
  })

  it("does not enable the templates query while closed", () => {
    render(false)

    expect(useAvailableTemplates).toHaveBeenCalledTimes(1)
    const options = useAvailableTemplates.mock.calls[0][1] as
      | { enabled?: boolean }
      | undefined
    expect(options?.enabled).toBe(false)
  })

  it("enables the templates query once open", () => {
    render(true)

    const options = useAvailableTemplates.mock.calls[0][1] as
      | { enabled?: boolean }
      | undefined
    expect(options?.enabled).toBe(true)
  })

  it("passes the collection filter through", () => {
    render(true)

    expect(useAvailableTemplates.mock.calls[0][0]).toBeUndefined()
  })
})
