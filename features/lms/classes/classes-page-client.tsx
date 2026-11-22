'use client'
// ---------------------------------------------------------------------------
// _components/classes-page-client.tsx
// Main client shell for Classes Management
// Table pattern: client-side search/sort/filter via useClientTable
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react'
import { Plus, Search, Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

import { useSetDashboardHeader } from '@/features/lms/classes/panel-header'
import { useClassStore } from '@/features/lms/stores/use-class-store'
import { useAllClasses, useDeleteClass } from '@/features/lms/hooks/classes/use-classes'
import { useClientTable, type ClientSort } from '@/hooks/use-client-table'
import { toClassItem } from '@/features/lms/types/class'
import type { ClassItem } from '@/features/lms/types/class'
import { useCan } from '@/lib/use-can'
import { PERMISSIONS } from '@/lib/permissions'
import { ClassesTable } from './classes-table'
import { ClassUpsertDialog } from './class-upsert-dialog'

// ---------------------------------------------------------------------------
// ClassItem fields type for useClientTable generic constraint
// ---------------------------------------------------------------------------
type ClassItemRecord = ClassItem & Record<string, unknown>

export function ClassesPageClient() {
  // ── Permissions ────────────────────────────────────────────────
  const canCreateClass = useCan(PERMISSIONS.CLASS_CREATE)

  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null)

  // ── Pagination & Sort state (client-side) ──────────────────────
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [sort, setSort] = useState<ClientSort<ClassItemRecord> | null>(null)

  // ── Data — fetch ALL classes (1 API call, then client-side process) ──
  const finishedClasses: 0 | 1 = activeTab === 'finished' ? 1 : 0
  const { data: rawClasses = [], isLoading, error, refetch } = useAllClasses(finishedClasses)

  // Deduplicate + transform to FE-ready ClassItem
  const allClasses: ClassItemRecord[] = (() => {
    const uniqueMap = new Map<string, (typeof rawClasses)[number]>()
    rawClasses.forEach((item) => {
      if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item)
    })
    return Array.from(uniqueMap.values()).map((raw) => {
      const item = toClassItem(raw)
      return {
        ...item,
        teacherNames: item.teachers.map((t) => t.name).join(', '),
      }
    }) as ClassItemRecord[]
  })()

  // ── Client-side table processing ──────────────────────────────
  const table = useClientTable<ClassItemRecord>({
    data: allClasses,
    searchFields: ['className', 'levelName', 'description', 'teacherNames'] as (keyof ClassItemRecord)[],
    searchQuery,
    sort,
    sortStorageKey: 'classes-table-sort',
    onSortChange: setSort,
    defaultSort: { field: 'className' as keyof ClassItemRecord, desc: false },
    page,
    pageSize,
  })

  // ── Mutations ──────────────────────────────────────────────────
  const deleteMutation = useDeleteClass()

  // ── Dialog controls ────────────────────────────────────────────
  const openCreateClass = useClassStore((s) => s.openCreateClass)

  // ── Inject breadcrumb + actions into shared header ─────────────
  const header = useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Classes Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: canCreateClass ? (
      <Button size="sm" onClick={openCreateClass}>
        <Plus className="mr-1.5 h-4 w-4" />
        Create Class
      </Button>
    ) : undefined,
  })

  // ── Sort handler — toggle: none → asc → desc → none ───────────
  const handleSortChange = useCallback(
    (field: string) => {
      const f = field as keyof ClassItemRecord
      if (sort?.field === f) {
        if (sort.desc) {
          setSort(null)
        } else {
          setSort({ field: f, desc: true })
        }
      } else {
        setSort({ field: f, desc: false })
      }
      setPage(1)
    },
    [sort],
  )

  // ── Tab change handler ─────────────────────────────────────────
  function handleTabChange(tab: string) {
    setActiveTab(tab as 'active' | 'finished')
    setSearchQuery('')
    setPage(1)
    setSort(null)
  }

  // ── Delete handler ─────────────────────────────────────────────
  function handleConfirmDelete() {
    if (!classToDelete) return
    deleteMutation.mutate(classToDelete.id, {
      onSettled: () => setClassToDelete(null),
    })
  }

  // ── Table props (shared between both tabs) ─────────────────────
  const tableProps = {
    items: table.items as ClassItem[],
    totalFiltered: table.totalFiltered,
    isLoading,
    onEdit: (item: ClassItem) => useClassStore.getState().openEditClass(item.id),
    onDelete: setClassToDelete,
    page: table.page,
    pageSize: table.pageSize,
    totalPages: table.totalPages,
    rangeStart: table.rangeStart,
    rangeEnd: table.rangeEnd,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    sortField: sort?.field as string | undefined,
    sortDesc: sort?.desc ?? false,
    onSortChange: handleSortChange,
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-w-[760px] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"><div>{header.breadcrumbs}</div><div>{header.actions}</div></header>
      {error && <div role="alert" className="p-4 text-destructive">Unable to load classes. <Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>}
      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex flex-col h-full"
          >
            {/* Tab bar + search (inline — same as materials) */}
            <div className="px-4 pt-3 pb-2 space-y-2 border-b shrink-0">
              <div className="flex items-center gap-3">
                <TabsList className="h-8">
                  <TabsTrigger
                    value="active"
                    className="text-xs h-7 px-3"
                  >
                    Active Classes
                  </TabsTrigger>
                  <TabsTrigger
                    value="finished"
                    className="text-xs h-7 px-3"
                  >
                    Finished Classes
                  </TabsTrigger>
                </TabsList>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search classes, teachers..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {/* Filter (placeholder) */}
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled>
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Table */}
            <TabsContent
              value="active"
              className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ClassesTable {...tableProps} />
            </TabsContent>

            <TabsContent
              value="finished"
              className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ClassesTable {...tableProps} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────── */}
      <AlertDialog
        open={!!classToDelete}
        onOpenChange={(open) => !open && setClassToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{classToDelete?.className}</strong>? This action cannot be
              undone. All associated data (students, lessons, teachers) may be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create/Edit Dialog ─────────────────────────────────── */}
      <ClassUpsertDialog />
    </div>
  )
}
