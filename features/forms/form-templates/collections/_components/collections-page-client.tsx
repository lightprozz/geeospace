'use client'

// ---------------------------------------------------------------------------
// _components/collections-page-client.tsx — Collections management page
// Mirrors roles-page-client.tsx pattern with list + CRUD dialog
// ---------------------------------------------------------------------------

import { useState } from 'react'
import Link from '@/features/forms/window-adapter'
import { FolderOpen, Plus, Pencil, Trash2, Users, ExternalLink } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
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
import { useCollections } from '@/features/lms/hooks/form-templates/use-collections'
import { useDeleteCollection } from '../hooks/use-collection-mutations'
import { CollectionFormDialog } from './collection-form-dialog'
import type { Collection } from '@/features/lms/types/form-template'

export function CollectionsPageClient() {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: collections, isLoading } = useCollections()
  const deleteCollection = useDeleteCollection()

  const filtered = collections?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Biểu mẫu
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Collections</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  })

  function handleCreate() {
    setSelectedCollection(null)
    setDialogOpen(true)
  }

  function handleEdit(collection: Collection) {
    setSelectedCollection(collection)
    setDialogOpen(true)
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteCollection.mutate(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Tìm collection..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Tạo collection
        </Button>
      </div>

      {/* Table */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="w-24 text-center">Biểu mẫu</TableHead>
                <TableHead className="w-24 text-center">Trạng thái</TableHead>
                <TableHead className="w-32 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 opacity-20" />
                      <p className="font-medium">
                        {searchQuery
                          ? 'Không có collection khớp tìm kiếm'
                          : 'Chưa có collection nào'}
                      </p>
                      <p className="text-sm">
                        {searchQuery
                          ? 'Thử từ khoá tìm kiếm khác'
                          : 'Tạo collection đầu tiên để bắt đầu'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>
                      <div className="font-medium">{collection.name}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {collection.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        {collection.templateCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          collection.active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {collection.active ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Drilldown into the template list, pre-filtered by this
                            collection. The list reads the `collection` query
                            param, so the link stays shareable. */}
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Xem biểu mẫu"
                        >
                          <Link
                            href={`/form-templates?collection=${encodeURIComponent(collection.id)}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(collection)}
                          title="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(collection)}
                          title="Xoá"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Create/Edit dialog */}
      <CollectionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collection={selectedCollection}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá collection</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xoá &ldquo;{deleteTarget?.name}&rdquo;? Các biểu mẫu
              thuộc collection này sẽ được gỡ collection. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
