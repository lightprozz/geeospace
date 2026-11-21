'use client'
// ---------------------------------------------------------------------------
// requests-page-client.tsx — Main client shell for the Requests Inbox
// Pattern: worklog-page-client.tsx anatomy (RSC wrapper → client shell)
// ---------------------------------------------------------------------------

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from '@/features/forms/window-adapter'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { useCollections } from '@/features/lms/hooks/form-templates/use-collections'
import { useRequestsQuery } from '@/features/lms/hooks/requests/use-requests'
import { useSort } from '@/hooks/use-sort'
import { useCanWriteRequests } from '@/lib/use-can'
import { REQUEST_PAGE_SIZE } from '@/features/lms/lib/requests/constants'
import {
  REQUESTS_TABLE_SORT_KEY,
  toRequestSort,
  type RequestSortColumn,
} from '@/features/lms/lib/requests/sorting'
import type { RequestTab } from '@/features/lms/types/request'

import {
  useActiveTab,
  useArchivedFilter,
  useCollectionId,
  useKeywordFilter,
  usePageFilter,
  usePageSizeFilter,
  useStatusFilter,
} from './requests-filters'
import { CreateRequestDialog } from './create-request-dialog'
import { RequestsCollectionsSidebar } from './requests-collections-sidebar'
import { RequestsTable } from './requests-table'
import { RequestsTabs } from './requests-tabs'
import { RequestsToolbar } from './requests-toolbar'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RequestsPageClient() {
  const router = useRouter()
  const canWriteRequests = useCanWriteRequests()

  // ── Filter state (nuqs — all URL params are strings) ────────────────
  const [activeTab, setActiveTab] = useActiveTab()
  const [collectionId, setCollectionId] = useCollectionId()
  const [status, setStatus] = useStatusFilter()
  const [keyword, setKeyword] = useKeywordFilter()
  const [archived, setArchived] = useArchivedFilter()
  const [page, setPage] = usePageFilter()
  const [pageSize, setPageSize] = usePageSizeFilter()

  const tab = (activeTab ?? 'action') as RequestTab

  // ── Parse numeric params ─────────────────────────────────────────────
  const parsedPage = page ? Math.max(1, parseInt(page, 10)) : 1
  const parsedPageSize = pageSize ? Math.max(1, parseInt(pageSize, 10)) : REQUEST_PAGE_SIZE

  // ── Sorting ──────────────────────────────────────────────────────────
  // The table's sortable columns are exactly the server's sort allow-list.
  // `useSort` persists the choice in localStorage; the query below turns it
  // into the server's `sort` clause.
  const { sortConfig, toggleSort } = useSort<RequestSortColumn>(
    REQUESTS_TABLE_SORT_KEY,
    null,
  )

  // ── Dialog state ────────────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // ── Server data ─────────────────────────────────────────────────────
  // `page`, `pageSize` and `sort` belong to the QUERY, not to the filters:
  // they change which rows come back, so leaving them out made the client
  // fetch the same first page on every page turn and ignore the sort the
  // user picked in the header.
  const filters = useMemo(
    () => ({
      collectionId: collectionId ?? undefined,
      status: status ? Number(status) : undefined,
      keyword: keyword ?? undefined,
      archived: archived === 'true',
      page: parsedPage,
      pageSize: parsedPageSize,
      sort: toRequestSort(sortConfig),
    }),
    [collectionId, status, keyword, archived, parsedPage, parsedPageSize, sortConfig],
  )

  const {
    data: listData,
    isLoading,
    isError,
    error,
  } = useRequestsQuery(tab, filters, { enabled: !!tab })

  const items = useMemo(() => listData?.items ?? [], [listData?.items])
  const totalFiltered = listData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalFiltered / parsedPageSize))

  // ── Collections sidebar ────────────────────────────────────────────────
  // The collection LIST comes from the collections lookup, not from the rows
  // on screen: counting the current page made the sidebar change every time
  // the user picked a collection (the filtered page no longer contained the
  // other collections) and made the badge describe one page instead of the
  // whole tab. Selecting a collection now ONLY filters — it never recounts.
  //
  // The lookup's server count is the number of TEMPLATES in the collection,
  // not the number of requests, so it is deliberately NOT shown here: a badge
  // that answers a different question than the one being asked is worse than
  // no badge at all (the old app showed the names only).
  const collectionsQuery = useCollections()
  const collections = useMemo(
    () =>
      (collectionsQuery.data ?? []).map((c) => ({
        id: c.id as string | null,
        name: c.name,
      })),
    [collectionsQuery.data],
  )

  // ── Handlers (declared before JSX to avoid TDZ) ──────────────────────
  const handleViewRequest = useCallback(
    (id: string) => router.push(`/requests/${id}`),
    [router],
  )

  const handlePageChange = useCallback(
    (newPage: number) => setPage(String(newPage)),
    [setPage],
  )

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(String(newSize))
      setPage('1')
    },
    [setPageSize, setPage],
  )

  // ── Toolbar ──────────────────────────────────────────────────────────
  const toolbar = (
    <RequestsToolbar
      search={keyword}
      onSearchChange={(v) => setKeyword(v ?? null)}
      status={status}
      onStatusChange={(v) => setStatus(v ?? null)}
      archived={archived === 'true'}
      onArchivedChange={(v) => setArchived(v ? 'true' : null)}
    />
  )

  // ── Table ───────────────────────────────────────────────────────────
  const table = (
    <RequestsTable
      items={items}
      isLoading={isLoading}
      isError={isError}
      error={error}
      totalFiltered={totalFiltered}
      page={parsedPage}
      pageSize={parsedPageSize}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      onViewRequest={handleViewRequest}
      tab={tab}
      sortConfig={sortConfig}
      onSort={toggleSort}
    />
  )

  // ── Dashboard header ─────────────────────────────────────────────────
  useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs text-muted-foreground">Requests</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: canWriteRequests ? (
      <Button
        size="sm"
        variant="default"
        className="h-8 px-3 text-xs gap-1.5"
        onClick={() => setCreateDialogOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        New Request
      </Button>
    ) : undefined,
  })

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Collections sidebar */}
      <div className="w-[240px] shrink-0">
        <RequestsCollectionsSidebar
          collections={collections}
          selectedId={collectionId}
          isLoading={collectionsQuery.isLoading}
          onSelect={(id: string | null) => {
            setCollectionId(id)
            setPage('1')
          }}
          onCreateRequest={canWriteRequests ? () => setCreateDialogOpen(true) : undefined}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <RequestsTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collectionId={collectionId}
          status={status}
          keyword={keyword}
          archived={archived}
          toolbar={toolbar}
          table={table}
        />
      </div>

      {/* Create dialog */}
      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        collectionId={collectionId}
      />
    </div>
  )
}
