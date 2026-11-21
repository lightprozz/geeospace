'use client'
// ---------------------------------------------------------------------------
// api-config-section.tsx
// FG4: the per-process "API config" list, shown in the workflow step drawer.
//
// An API config binds an internal FunctionType (a reusable handler registered
// in the BE) to a workflow step, so the step can call that function when the
// process reaches a given action. The BE owns the CRUD; this component owns
// the form and the list.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { getLookupFunctionTypes } from '../../../lib/api'
import type {
  ApiConfigDto,
  CreateApiConfigRequest,
  HttpMethod,
  ParamDto,
  ProcessAction,
} from '../types/trigger'
import {
  HTTP_METHOD_LABELS,
  PROCESS_ACTION_LABELS,
  VALID_HTTP_METHODS,
  VALID_PROCESS_ACTIONS,
} from '../types/trigger'
import { ParameterTable } from './parameter-table'
import { useApiConfigsQuery } from '../hooks/use-api-configs'
import {
  useCreateApiConfigMutation,
  useDeleteApiConfigMutation,
  useUpdateApiConfigMutation,
} from '../hooks/use-trigger-mutations'

interface ApiConfigSectionProps {
  /** The step (process) the configs belong to. */
  processId: string
  /** Whether the current user may write API configs. */
  canManage: boolean
}

interface ApiConfigFormState {
  functionType: string
  triggerName: string
  processAction: ProcessAction
  httpMethod: HttpMethod
  apiUrl: string
  parameters: ParamDto[]
}

function emptyForm(): ApiConfigFormState {
  return {
    functionType: '',
    triggerName: '',
    processAction: 'APPROVED',
    httpMethod: 'POST',
    apiUrl: '',
    parameters: [],
  }
}

function configToForm(config: ApiConfigDto): ApiConfigFormState {
  return {
    functionType: config.functionType,
    triggerName: config.triggerName || config.functionType,
    processAction: config.processAction,
    httpMethod: config.httpMethod,
    apiUrl: config.apiUrl,
    parameters: config.parameters,
  }
}

export function ApiConfigSection({ processId, canManage }: ApiConfigSectionProps) {
  const { data: configs, isLoading } = useApiConfigsQuery(processId)
  const createMutation = useCreateApiConfigMutation(processId)
  const updateMutation = useUpdateApiConfigMutation(processId)
  const deleteMutation = useDeleteApiConfigMutation(processId)

  const functionTypesQuery = useQuery({
    queryKey: ['lookups', 'function-types'],
    queryFn: () => getLookupFunctionTypes(),
    staleTime: 5 * 60 * 1000,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApiConfigDto | null>(null)
  const [form, setForm] = useState<ApiConfigFormState>(emptyForm())
  const [pendingDelete, setPendingDelete] = useState<ApiConfigDto | null>(null)

  const set = <K extends keyof ApiConfigFormState>(
    key: K,
    value: ApiConfigFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (config: ApiConfigDto) => {
    setEditing(config)
    setForm(configToForm(config))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.functionType.trim()) {
      toast.error('Function type là bắt buộc')
      return
    }
    if (!form.apiUrl.trim()) {
      toast.error('API URL là bắt buộc')
      return
    }

    const body: CreateApiConfigRequest = {
      functionType: form.functionType.trim(),
      triggerName: form.triggerName.trim() || form.functionType.trim(),
      processAction: form.processAction,
      httpMethod: form.httpMethod,
      apiUrl: form.apiUrl.trim(),
      parameters: form.parameters.filter((p) => p.key.trim()),
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({ configId: editing.id, body })
        toast.success('Đã cập nhật API config')
      } else {
        await createMutation.mutateAsync(body)
        toast.success('Đã tạo API config')
      }
      setDialogOpen(false)
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Không lưu được API config',
      )
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success('Đã xoá API config')
    } catch {
      toast.error('Không xoá được API config')
    } finally {
      setPendingDelete(null)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Cấu hình API</Label>
        {canManage ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openCreate}>
            <Plus className="size-3 mr-1" />
            Thêm
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-[10px] text-muted-foreground">Đang tải cấu hình API…</p>
      ) : (configs ?? []).length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          Chưa có cấu hình API nào cho bước này.
        </p>
      ) : (
        <div className="space-y-1">
          {(configs ?? []).map((config) => (
            <div
              key={config.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {config.triggerName || config.functionType}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {config.httpMethod} · {config.apiUrl}
                </p>
              </div>
              {canManage ? (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    aria-label={`Sửa ${config.triggerName || config.functionType}`}
                    onClick={() => openEdit(config)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    aria-label={`Xoá ${config.triggerName || config.functionType}`}
                    onClick={() => setPendingDelete(config)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Sửa API config' : 'Thêm API config'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-3">
              <div className="space-y-1">
                <Label htmlFor="api-config-function-type" className="text-xs">
                  Function type *
                </Label>
                <Select
                  value={form.functionType || undefined}
                  onValueChange={(v: string) => {
                    const selected = (functionTypesQuery.data ?? []).find(
                      (ft) => ft.id === v,
                    )
                    setForm((prev) => ({
                      ...prev,
                      functionType: v,
                      // The lookup carries the default endpoint; prefill it so
                      // the author does not have to retype the same URL.
                      apiUrl: prev.apiUrl || selected?.apiUrl || '',
                      httpMethod: prev.apiUrl
                        ? prev.httpMethod
                        : ((selected?.httpMethod?.toUpperCase() as HttpMethod) ??
                          prev.httpMethod),
                    }))
                  }}
                >
                  <SelectTrigger id="api-config-function-type" className="h-7 text-xs">
                    <SelectValue placeholder="Chọn function type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(functionTypesQuery.data ?? []).map((ft) => (
                      <SelectItem key={ft.id} value={ft.id}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="api-config-name" className="text-xs">
                  Tên hiển thị
                </Label>
                <Input
                  id="api-config-name"
                  className="h-7 text-xs"
                  value={form.triggerName}
                  onChange={(e) => set('triggerName', e.target.value)}
                  placeholder="Mặc định là function type"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Sự kiện</Label>
                <Select
                  value={form.processAction}
                  onValueChange={(v: string) =>
                    set('processAction', v as ProcessAction)
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_PROCESS_ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {PROCESS_ACTION_LABELS[action]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="api-config-url" className="text-xs">
                  API URL *
                </Label>
                <Input
                  id="api-config-url"
                  className="h-7 text-xs font-mono"
                  value={form.apiUrl}
                  onChange={(e) => set('apiUrl', e.target.value)}
                  placeholder="https://api.example.com/callback"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phương thức HTTP</Label>
                <Select
                  value={form.httpMethod}
                  onValueChange={(v: string) => set('httpMethod', v as HttpMethod)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_HTTP_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {HTTP_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-xs">Tham số</Label>
                <ParameterTable
                  value={form.parameters}
                  onChange={(v) => set('parameters', v)}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá API config?</AlertDialogTitle>
            <AlertDialogDescription>
              API config “{pendingDelete?.triggerName || pendingDelete?.functionType}”
              sẽ bị xoá khỏi bước này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
