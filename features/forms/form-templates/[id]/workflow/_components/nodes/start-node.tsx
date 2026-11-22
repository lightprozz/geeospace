'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Play, FileText } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { NODE_THEMES } from './node-themes'

export type StartNodeType = Node<{ label?: string }, 'start-node'>

/**
 * Synthetic "Gửi biểu mẫu" trigger marker that anchors the head of the
 * workflow canvas. Mirrors the mockup's green-on-emerald start node.
 */
function StartNodeComponent({ data }: NodeProps<StartNodeType>) {
  const theme = NODE_THEMES.trigger

  return (
    <div
      className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm"
      style={{ borderColor: theme.accent }}
    >
      {/* Horizontal flow leaves the start marker on its right edge. */}
      <Handle
        type="source"
        position={Position.Right}
        className={`${theme.handleClass} !size-2 !border-2 !border-background`}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex size-7 items-center justify-center rounded shadow-sm"
          style={{ backgroundColor: theme.accent }}
        >
          <Play className="ml-0.5 size-3.5 text-white" />
        </div>
        <div className="truncate text-sm font-bold uppercase tracking-wide text-foreground">
          Bắt đầu
        </div>
      </div>

      <div className="space-y-2 px-4 pb-3">
        <div className="flex flex-col gap-1.5 rounded-lg border border-transparent bg-muted/40 p-2.5 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trigger đầu vào
          </span>
          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-2 py-1.5 font-medium text-foreground shadow-sm">
            <FileText className="size-3.5 text-muted-foreground" />
            {data.label ?? 'Gửi biểu mẫu'}
          </div>
        </div>
      </div>
    </div>
  )
}

export const StartNode = memo(StartNodeComponent)
