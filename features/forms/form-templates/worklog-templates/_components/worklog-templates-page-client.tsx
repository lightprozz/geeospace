'use client'

// ---------------------------------------------------------------------------
// _components/worklog-templates-page-client.tsx — WorkLog template list page
// Mirrors the Sub-1 template list pattern
// ---------------------------------------------------------------------------

import { useState } from 'react'
import Link from '@/features/forms/window-adapter'
import { useRouter, useSearchParams } from '@/features/forms/window-adapter'
import { Clock, Plus, Pencil, Search, Power, PowerOff } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useCanWriteTemplates } from '@/lib/use-can'
import { fetchWorkLogTemplates } from '@/features/lms/lib/form-templates/api'
import { useQuery } from '@tanstack/react-query'
import { useSetWorkLogTemplateActiveMutation } from './use-worklog-templates'

export function WorkLogTemplatesPageClient() {
  const router = useRouter()
  const canWrite = useCanWriteTemplates()
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '')
  const [includeInactive, setIncludeInactive] = useState(
    searchParams.get('includeInactive') === 'true',
  )

  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = 25
  const sort = searchParams.get('sort') ?? undefined

  const { data, isLoading } = useQuery({
    queryKey: ['worklog-templates', 'list', { page, pageSize, sort, keyword, includeInactive }],
    queryFn: () =>
      fetchWorkLogTemplates({
        page,
        pageSize,
        sort,
        keyword: keyword || undefined,
        includeInactive: includeInactive || undefined,
      }),
  })

  useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Biểu mẫu
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Mẫu worklog</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  })

  function handleSearch(value: string) {
    setKeyword(value)
    const params = new URLSearchParams()
    if (value) params.set('keyword', value)
    if (includeInactive) params.set('includeInactive', 'true')
    router.replace(`/form-templates/worklog-templates?${params.toString()}`)
  }

  function handleIncludeInactive(next: boolean) {
    setIncludeInactive(next)
    const params = new URLSearchParams(searchParams)
    if (next) params.set('includeInactive', 'true')
    else params.delete('includeInactive')
    params.delete('page')
    router.replace(`/form-templates/worklog-templates?${params.toString()}`)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      {/* Header + search + create */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm mẫu worklog..."
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={includeInactive}
            onCheckedChange={(v) => handleIncludeInactive(Boolean(v))}
          />
          Hiện mẫu không hoạt động
        </label>
        {canWrite ? (
          <Button asChild>
            <Link href="/form-templates/worklog-templates/new">
              <Plus className="h-4 w-4 mr-1" />
              Tạo mẫu worklog
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Table */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead className="w-28 text-center">Trạng thái</TableHead>
                <TableHead className="w-32 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Clock className="h-12 w-12 opacity-20" />
                      <p className="font-medium">
                        {keyword ? 'Không có mẫu worklog nào khớp tìm kiếm' : 'Chưa có mẫu worklog nào'}
                      </p>
                      <p className="text-sm">
                        {keyword ? 'Thử một từ khoá khác' : 'Tạo mẫu worklog đầu tiên để bắt đầu'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="font-medium">{template.name}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {template.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.collectionName ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          template.deactivate
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {template.deactivate ? 'Không hoạt động' : 'Hoạt động'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite ? (
                          <>
                            <WorkLogActiveButton
                              templateId={template.id}
                              deactivate={template.deactivate}
                            />
                            <Button variant="ghost" size="icon" asChild title="Sửa">
                              <Link href={`/form-templates/worklog-templates/${template.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        ) : null}
                        <Button variant="ghost" size="icon" asChild title="Xem">
                          <Link href={`/form-templates/worklog-templates/${template.id}`}>
                            <Clock className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination footer */}
        {data && data.total > pageSize && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Đang hiển thị {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data.total)} trên {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set('page', String(page - 1))
                  router.replace(`/form-templates/worklog-templates?${params.toString()}`)
                }}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasNext}
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set('page', String(page + 1))
                  router.replace(`/form-templates/worklog-templates?${params.toString()}`)
                }}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/**
 * Activates or deactivates a WorkLog template.
 *
 * The target state is stated explicitly rather than toggled: the server may
 * hold a different state than the last page load, and a toggle would flip
 * whatever it finds.
 */
function WorkLogActiveButton({
  templateId,
  deactivate,
}: {
  templateId: string
  deactivate: boolean
}) {
  const mutation = useSetWorkLogTemplateActiveMutation()

  const handleClick = async () => {
    try {
      await mutation.mutateAsync({ id: templateId, isActive: deactivate })
    } catch {
      // Error surfaced by TanStack Query.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={mutation.isPending}
      title={deactivate ? 'Kích hoạt mẫu' : 'Vô hiệu hoá mẫu'}
    >
      {deactivate ? (
        <Power className="h-4 w-4 text-green-600" />
      ) : (
        <PowerOff className="h-4 w-4 text-yellow-600" />
      )}
    </Button>
  )
}
