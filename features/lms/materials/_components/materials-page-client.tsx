'use client'
// ---------------------------------------------------------------------------
// _components/materials-page-client.tsx
// Main materials page — Tabs: Library | Approvals + 2-panel layout
// Category filter + search + bulk actions + upsert dialog (create/edit)
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react'
import { Plus, Search, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelHeader } from '@/features/lms/port-support'
import { MaterialTable } from './material-table'
import { MaterialDetailPanel } from './material-detail-panel'
import { MaterialUpsertDialog } from './material-upsert-dialog'
import { MaterialPreviewDialog } from './material-preview-dialog'
import { CategoryFilter } from './category-filter'
import {
  useMaterialsQuery,
  useBulkApproveMaterials,
  useBulkDeletePending,
} from '@/features/lms/hooks/materials/use-materials'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import {
  CATEGORY_FLAG_KEYS,
  type MaterialListItem,
  type MaterialCategoryFlags,
} from '@/features/lms/types/material'

export function MaterialsPageClient() {
  const { can } = usePermission()
  const canCreateMaterial = can(PERMISSIONS.CONTENT_MATERIAL_WRITE)
  const canApproveMaterial = can(PERMISSIONS.CONTENT_MATERIAL_APPROVE)
  const canDeleteMaterial = can(PERMISSIONS.CONTENT_MATERIAL_DELETE)

  const [activeTab, setActiveTab] = useState<'library' | 'approvals'>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFlags, setCategoryFlags] = useState<Partial<MaterialCategoryFlags>>({})
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination & Sort state
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(20)

  // Sort state with localStorage persistence
  const [sortField, setSortField] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined
    try {
      const stored = localStorage.getItem('materials-table-sort')
      if (stored) {
        const { field } = JSON.parse(stored)
        return field
      }
    } catch { /* ignore */ }
    return undefined
  })
  const [sortDesc, setSortDesc] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem('materials-table-sort')
      if (stored) {
        const { desc } = JSON.parse(stored)
        return desc
      }
    } catch { /* ignore */ }
    return false
  })

  // Persist sort to localStorage
  const handleSortChange = (field: string) => {
    const newDesc = sortField === field ? !sortDesc : false

    if (sortField === field && sortDesc) {
      // Toggle off if already desc
      setSortField(undefined)
      setSortDesc(false)
      localStorage.removeItem('materials-table-sort')
    } else {
      setSortField(field)
      setSortDesc(newDesc)
      localStorage.setItem('materials-table-sort', JSON.stringify({ field, desc: newDesc }))
    }
  }

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editMaterial, setEditMaterial] = useState<MaterialListItem | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<MaterialListItem | null>(null)
  const [confirmBulkApprove, setConfirmBulkApprove] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const activeCategoryKeys = useMemo(() => {
    return CATEGORY_FLAG_KEYS.filter((k) => categoryFlags[k])
  }, [categoryFlags])

  // ── Data ──────────────────────────────────────────────────────────
  const { data: queryResult, isLoading, isError } = useMaterialsQuery({
    status: activeTab === 'library' ? 'approved' : 'pending',
    page: page + 1, // API is 1-indexed, UI is 0-indexed
    pageSize,
    search: searchQuery,
    categories: activeCategoryKeys.length > 0 ? activeCategoryKeys : undefined,
    sort: sortField ? [{ field: sortField, desc: sortDesc }] : undefined,
  })

  const activeMaterials = queryResult?.items ?? []
  const apiTotalCount = queryResult?.total ?? 0

  // The 'pending' count on the tab badge might be inaccurate if we use the paginated response.
  // We can just omit the count or fetch it separately, but for now we'll use apiTotalCount if activeTab is approvals.
  // Wait, if activeTab is library, we don't know the pending count unless we fetch it. 
  // Let's remove the pending count for now, or use a separate query just for the count if needed.
  // I will just remove the pending count badge or leave it as 0 if not on approvals.

  const { mutate: bulkApprove, isPending: isBulkApproving } = useBulkApproveMaterials()
  const { mutate: bulkDelete, isPending: isBulkDeleting } = useBulkDeletePending()

  // Auto-sync selected material with latest cache
  const selectedMaterial = useMemo(() => {
    return activeMaterials.find((m) => m.id === selectedMaterialId) || null
  }, [activeMaterials, selectedMaterialId])

  // ── Inject breadcrumb + actions into shared header ──────────────
  const panelHeader = <PanelHeader config={{
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Materials Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: canCreateMaterial ? (
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Create Material
      </Button>
    ) : undefined,
  }} />


  // ── Handlers ────────────────────────────────────────────────────
  function handleSelectAll(checked: boolean, pageIds: string[]) {
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleRowClick(material: MaterialListItem) {
    setSelectedMaterialId(material.id)
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab as 'library' | 'approvals')
    setSelectedMaterialId(null)
    setSelectedIds(new Set())
    setSearchQuery('')
    setCategoryFlags({})
    setPage(0)
    setSortField(undefined)
    setSortDesc(false)
  }

  function handleEdit(material: MaterialListItem) {
    setEditMaterial(material)
  }

  function handlePreview(material: MaterialListItem) {
    setPreviewMaterial(material)
  }

  function handleUpsertClose() {
    setCreateOpen(false)
    setEditMaterial(null)
  }

  return (
    <div className="@container flex h-full min-w-0 flex-col">
      {panelHeader}
      {isError && <p role="alert">Unable to load materials.</p>}
      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Main panel */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex flex-col h-full"
          >
            {/* Tab bar + search + category filter + bulk actions */}
            <div className="px-4 pt-3 pb-2 space-y-2 border-b shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <TabsList className="h-8">
                  <TabsTrigger
                    value="library"
                    className="text-xs h-7 px-3"
                  >
                    Library
                  </TabsTrigger>
                  <TabsTrigger
                    value="approvals"
                    className="text-xs h-7 px-3 gap-1.5"
                  >
                    Approvals
                  </TabsTrigger>
                </TabsList>

                {/* Search */}
                <div className="relative flex-1 min-w-40 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, owner, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {/* Category filter */}
                <CategoryFilter
                  activeFlags={categoryFlags}
                  onFlagsChange={setCategoryFlags}
                  onReset={() => setCategoryFlags({})}
                />

                {/* Bulk actions — approvals tab with selections */}
                {activeTab === 'approvals' && selectedIds.size > 0 && (canApproveMaterial || canDeleteMaterial) && (
                  <div className="flex gap-2">
                    {canApproveMaterial && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                        onClick={() => setConfirmBulkApprove(true)}
                        disabled={isBulkApproving}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Approve ({selectedIds.size})
                      </Button>
                    )}
                    {canDeleteMaterial && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => setConfirmBulkDelete(true)}
                        disabled={isBulkDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete ({selectedIds.size})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <TabsContent
              value="library"
              className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <MaterialTable
                materials={activeMaterials}
                apiTotalCount={apiTotalCount}
                isLoading={isLoading}
                selectedIds={selectedIds}
                activeMaterialId={selectedMaterial?.id}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onRowClick={handleRowClick}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sortField={sortField}
                sortDesc={sortDesc}
                onSortChange={handleSortChange}
              />
            </TabsContent>
            <TabsContent
              value="approvals"
              className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <MaterialTable
                materials={activeMaterials}
                apiTotalCount={apiTotalCount}
                isLoading={isLoading}
                selectedIds={selectedIds}
                activeMaterialId={selectedMaterial?.id}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onRowClick={handleRowClick}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sortField={sortField}
                sortDesc={sortDesc}
                onSortChange={handleSortChange}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Detail panel — right side */}
        {selectedMaterial && (
          <MaterialDetailPanel
            material={selectedMaterial}
            activeTab={activeTab}
            onClose={() => setSelectedMaterialId(null)}
            onDeleted={() => setSelectedMaterialId(null)}
            onEdit={handleEdit}
            onPreview={handlePreview}
          />
        )}
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <MaterialUpsertDialog
        open={createOpen || !!editMaterial}
        material={editMaterial ?? undefined}
        onClose={handleUpsertClose}
      />

      {/* Preview dialog */}
      <MaterialPreviewDialog
        open={!!previewMaterial}
        material={previewMaterial}
        onClose={() => setPreviewMaterial(null)}
      />

      {/* Bulk approve confirm */}
      <AlertDialog
        open={confirmBulkApprove}
        onOpenChange={(o) => !o && setConfirmBulkApprove(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Approve {selectedIds.size} materials?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All selected materials will be moved to the public library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkApproving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() =>
                bulkApprove([...selectedIds], {
                  onSuccess: () => {
                    setConfirmBulkApprove(false)
                    setSelectedIds(new Set())
                  },
                })
              }
            >
              {isBulkApproving ? 'Approving...' : 'Approve All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog
        open={confirmBulkDelete}
        onOpenChange={(o) => !o && setConfirmBulkDelete(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} pending materials?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. Selected materials will be deleted
              and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                bulkDelete([...selectedIds], {
                  onSuccess: () => {
                    setConfirmBulkDelete(false)
                    setSelectedIds(new Set())
                  },
                })
              }
            >
              {isBulkDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
