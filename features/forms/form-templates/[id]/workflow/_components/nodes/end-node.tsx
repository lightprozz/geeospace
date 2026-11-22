'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CircleDot } from 'lucide-react'
import type { Node } from '@xyflow/react'

export type EndNodeType = Node<{ label?: string }, 'end-node'>

/**
 * Synthetic "Kết thúc" marker that closes the tail of the workflow canvas.
 * Mirrors the mockup's dashed-border circle-dot end marker.
 */
function EndNodeComponent({ data }: NodeProps<EndNodeType>) {
  return (
    <div className="flex items-center justify-center">
      {/* Horizontal flow enters the end marker on its left edge. */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !bg-muted-foreground"
      />

      <div className="flex items-center gap-2 rounded-full border-2 border-dashed border-muted-foreground/40 bg-background px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm">
        <CircleDot className="size-4" />
        {data.label ?? 'Kết thúc'}
      </div>
    </div>
  )
}

export const EndNode = memo(EndNodeComponent)
