import { beforeEach, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { ComponentProps } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FormTemplatesPageClient } from "@/features/forms/form-templates/_components/form-templates-page-client"
import { FormTemplateDetailClient } from "@/features/forms/form-templates/_components/form-template-detail-client"

const state = vi.hoisted(() => ({
  deactivate: false,
  mutateAsync: vi.fn(),
  buttons: [] as { title?: string; label: string; onClick?: () => unknown }[],
}))
const template = () => ({ id: "template", name: "Leave", deactivate: state.deactivate, fields: [], campusNames: [] })
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, title, onClick }: ComponentProps<"button">) => {
    state.buttons.push({ title, label: renderToStaticMarkup(<>{children}</>), onClick: onClick as () => unknown })
    return <button>{children}</button>
  },
}))
vi.mock("@/features/forms/window-adapter", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSetDashboardHeader: vi.fn(),
}))
vi.mock("@/lib/use-can", () => ({ useCanWriteTemplates: () => true }))
vi.mock("@/features/forms/form-templates/hooks/use-template-mutations", () => ({
  useSetActive: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
}))
vi.mock("@/features/forms/form-templates/hooks/use-template", () => ({
  useTemplate: () => ({ data: template() }),
}))
vi.mock("@/features/forms/form-templates/hooks/use-templates", () => ({
  useTemplates: () => ({ data: { result: { items: [template()], total: 1 } } }),
}))
vi.mock("@/features/forms/form-templates/[id]/workflow/hooks/use-processes", () => ({
  useProcessesQuery: () => ({ data: [{ id: "step" }] }),
}))
vi.mock("@/features/lms/hooks/form-templates/use-collections", () => ({
  useCollections: () => ({ data: [] }),
}))
vi.mock("@/features/forms/form-templates/_components/form-templates-filters", () => ({
  usePageFilter: () => ["1", vi.fn()],
  useCollectionFilter: () => [null, vi.fn()],
}))
vi.mock("@/features/forms/form-templates/_components/form-templates-collections-sidebar", () => ({
  FormTemplatesCollectionsSidebar: () => null,
}))
vi.mock("@/features/forms/form-templates/_components/three-column-builder", () => ({
  ThreeColumnBuilder: () => null,
}))

beforeEach(() => {
  state.buttons = []
  state.mutateAsync.mockReset()
})

it.each([false, true])("list activation sends the target active state when deactivate=%s", async deactivate => {
  state.deactivate = deactivate
  renderToStaticMarkup(<FormTemplatesPageClient />)
  const toggle = state.buttons.find(button => button.title === (deactivate ? "Kích hoạt mẫu" : "Vô hiệu hoá mẫu"))
  expect(toggle).toBeDefined()
  await toggle!.onClick!()
  expect(state.mutateAsync).toHaveBeenCalledWith(deactivate)
})

it.each([false, true])("detail activation sends the target active state when deactivate=%s", async deactivate => {
  state.deactivate = deactivate
  renderToStaticMarkup(<TooltipProvider><FormTemplateDetailClient id="template" /></TooltipProvider>)
  const toggle = state.buttons.find(button => button.label.includes(deactivate ? "Kích hoạt" : "Vô hiệu hóa"))
  expect(toggle).toBeDefined()
  await toggle!.onClick!()
  expect(state.mutateAsync).toHaveBeenCalledWith(deactivate)
})
