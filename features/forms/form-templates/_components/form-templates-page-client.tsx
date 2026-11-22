'use client'
// ---------------------------------------------------------------------------
// _components/form-templates-page-client.tsx
// List page client shell for form templates.
// Mirrors requests-page-client.tsx: Collections sidebar + main content.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useRouter } from "@/features/forms/window-adapter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, PowerOff, Power, X, Workflow, Webhook } from "lucide-react"
import { useTemplates } from "../hooks/use-templates"
import { useSetActive } from "../hooks/use-template-mutations"
import { useCollections } from "@/features/lms/hooks/form-templates/use-collections"
import { FormTemplatesCollectionsSidebar } from "./form-templates-collections-sidebar"
import { useCollectionFilter, usePageFilter } from "./form-templates-filters"
import { FormTemplatesEmptyState, FormTemplatesErrorState } from "./form-templates-list-states"
import { useCanWriteTemplates } from "@/lib/use-can"
import type { TemplateListItem } from '@/features/lms/types/form-template'

export function FormTemplatesPageClient() {
  const router = useRouter()
  const canWrite = useCanWriteTemplates()
  const [keyword, setKeyword] = useState("")
  const [pageStr, setPageStr] = usePageFilter()
  const page = Number(pageStr ?? "1") || 1
  const [pageSize] = useState(25)
  const [collectionId, setCollectionId] = useCollectionFilter()
  const [includeInactive, setIncludeInactive] = useState(false)

  const templatesQuery = useTemplates({
    keyword: keyword || undefined,
    collectionId: collectionId ?? undefined,
    page,
    pageSize,
    includeInactive: includeInactive || undefined,
  })
  const collectionsQuery = useCollections()
  const collections = (collectionsQuery.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    count: c.templateCount,
  }))

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Collections sidebar */}
      <div className="w-[240px] shrink-0">
        <FormTemplatesCollectionsSidebar
          collections={collections}
          selectedId={collectionId}
          isLoading={collectionsQuery.isLoading}
          onSelect={(id) => {
            setCollectionId(id)
            setPageStr(null)
          }}
          onCreateTemplate={
            canWrite ? () => router.push("/form-templates/new") : undefined
          }
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Biểu mẫu</h1>
            <p className="text-sm text-muted-foreground">
              Xây dựng và quản lý các mẫu biểu mẫu yêu cầu
            </p>
          </div>
          {canWrite ? (
            <Button onClick={() => router.push("/form-templates/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Mẫu mới
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button type="button" variant="outline" size="sm" onClick={() => router.push("/form-templates/collections")}>
              Manage collections
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => router.push("/form-templates/worklog-templates")}>
            Worklog templates
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm biểu mẫu..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPageStr(null)
              }}
              className="pl-9"
            />
          </div>
          {collectionId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setCollectionId(null)
                setPageStr(null)
              }}
            >
              <X className="h-3.5 w-3.5" />
              Xoá bộ lọc collection
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={includeInactive}
              onCheckedChange={(v) => {
                setIncludeInactive(Boolean(v))
                setPageStr(null)
              }}
            />
            Hiện mẫu không hoạt động
          </label>
        </div>

        {/* Table */}
        {templatesQuery.isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải…</div>
        ) : templatesQuery.isError ? (
          <FormTemplatesErrorState
            onRetry={() => templatesQuery.refetch()}
            isRetrying={templatesQuery.isFetching}
          />
        ) : templatesQuery.data?.result.items.length === 0 ? (
          <FormTemplatesEmptyState hasFilters={!!(keyword || collectionId)} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Cơ sở</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesQuery.data?.result.items.map((template: TemplateListItem) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/form-templates/${template.id}`)}
                          className="text-left hover:underline"
                        >
                          {template.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{template.templateType}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {template.collectionName ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <CampusCell names={template.campusNames} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            template.deactivate
                              ? "bg-yellow-100 text-yellow-800"
                              : template.isPublished
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {template.deactivate
                            ? "Không hoạt động"
                            : template.isPublished
                              ? "Đã xuất bản"
                              : "Bản nháp"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(template.createdDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Shortcuts to the template's own sub-pages. These are
                              reads, so they stay available to every user who
                              can see the list. */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Mở trình thiết kế quy trình"
                            onClick={() =>
                              router.push(`/form-templates/${template.id}/workflow`)
                            }
                          >
                            <Workflow className="mr-1.5 h-4 w-4" />
                            Workflow
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Mở xem trước API và trigger"
                            onClick={() =>
                              router.push(`/form-templates/${template.id}/api`)
                            }
                          >
                            <Webhook className="mr-1.5 h-4 w-4" />
                            API
                          </Button>
                          {canWrite ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(`/form-templates/${template.id}/edit`)
                                }
                              >
                                Sửa
                              </Button>
                              <ToggleActivateButton
                                templateId={template.id}
                                deactivate={template.deactivate}
                              />
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {templatesQuery.data?.result && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Đang hiển thị {((page - 1) * pageSize) + 1}–
                  {Math.min(page * pageSize, templatesQuery.data.result.total ?? 0)} trong tổng số{" "}
                  {templatesQuery.data.result.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageStr(String(Math.max(1, page - 1)))}
                    disabled={page === 1}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageStr(String(page + 1))}
                    disabled={!templatesQuery.data.result.hasNext}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ToggleActivateButton({ templateId, deactivate }: { templateId: string; deactivate: boolean }) {  const toggleMutation = useSetActive(templateId)

  const handleToggle = async () => {
    try {
      // State is stated explicitly, not toggled — the server may hold a different
      // state than the last page load, and a toggle would flip whatever it finds.
      await toggleMutation.mutateAsync(deactivate)
    } catch {
      // Error handled by TanStack
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={toggleMutation.isPending}
      title={deactivate ? "Kích hoạt mẫu" : "Vô hiệu hoá mẫu"}
    >
      {deactivate ? <Power className="h-4 w-4 text-green-600" /> : <PowerOff className="h-4 w-4 text-yellow-600" />}
    </Button>
  )
}

/**
 * Renders the campuses a template is visible to. A template may be linked to
 * several campuses, so the cell shows them as badges and falls back to an
 * em dash when there is none.
 */
function CampusCell({ names }: { names: string[] | undefined }) {
  const list = names ?? []
  if (list.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {list.map((name) => (
        <span
          key={name}
          className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  )
}
