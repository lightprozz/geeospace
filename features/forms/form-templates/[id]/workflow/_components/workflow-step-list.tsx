'use client'
// ---------------------------------------------------------------------------
// workflow-step-list.tsx
// The floating step navigator. It lists the steps in their flow order and
// lets the user move a step up or down; the reordering is written through
// `useReorderProcessesMutation`, which takes the full positional id list.
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProcessesQuery } from '../hooks/use-processes'
import { useReorderProcessesMutation } from '../hooks/use-process-mutations'
import { TYPE_APPROVAL_LABEL } from '../types/workflow'
import type { ProcessStepDto } from '../types/workflow'
import { NODE_THEMES, themeKeyForStepType } from './nodes/node-themes'
import { cn } from '@/lib/utils'

interface WorkflowStepListProps {
  templateId: string
  selectedStepId: string | null
  onStepSelect: (id: string) => void
  onAddStep: () => void
}

export function WorkflowStepList({
  templateId,
  selectedStepId,
  onStepSelect,
  onAddStep,
}: WorkflowStepListProps) {
  const { data: steps, isLoading, isError } = useProcessesQuery(templateId)
  const reorderMutation = useReorderProcessesMutation(templateId)

  // The list always shows the steps in flow order, matching the canvas chain.
  const orderedSteps = useMemo(
    () =>
      [...(steps ?? [])].sort(
        (a: ProcessStepDto, b: ProcessStepDto) =>
          (a.processOrder ?? 0) - (b.processOrder ?? 0),
      ),
    [steps],
  )

  const moveStep = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= orderedSteps.length) return
    const next = [...orderedSteps]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    reorderMutation.mutate({ processIds: next.map((s) => s.id) })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold">Danh sách bước</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-muted-foreground text-xs">Đang tải…</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold">Danh sách bước</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-3">
          <span className="text-destructive text-xs text-center">
            Không tải được danh sách bước.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs font-semibold">
          Danh sách bước ({orderedSteps.length})
        </span>
        <Button size="icon-sm" variant="ghost" onClick={onAddStep} title="Thêm bước">
          <Plus className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {orderedSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 px-3">
            <p className="text-muted-foreground text-xs text-center">
              Chưa có bước nào.
            </p>
            <Button size="sm" variant="outline" onClick={onAddStep}>
              <Plus className="size-3 mr-1" />
              Thêm bước
            </Button>
          </div>
        ) : (
          <ul className="p-1 space-y-0.5">
            {orderedSteps.map((step: ProcessStepDto, index: number) => {
              const theme = NODE_THEMES[themeKeyForStepType(step.typeApprovalId)]
              const label = TYPE_APPROVAL_LABEL[step.typeApprovalId] ?? 'Không rõ'
              const isSelected = step.id === selectedStepId

              return (
                <li key={step.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onStepSelect(step.id)}
                    className={cn(
                      'min-w-0 flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-xs',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground',
                    )}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="flex-1 truncate">{step.processName}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {label}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="Đưa bước lên"
                      aria-label={`Đưa bước ${step.processName} lên`}
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => moveStep(index, -1)}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="Đưa bước xuống"
                      aria-label={`Đưa bước ${step.processName} xuống`}
                      disabled={
                        index === orderedSteps.length - 1 || reorderMutation.isPending
                      }
                      onClick={() => moveStep(index, 1)}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
