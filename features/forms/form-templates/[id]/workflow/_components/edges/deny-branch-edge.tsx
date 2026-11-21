'use client'

import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DenyEdgeData {
  kind?: string
  onDenyBranchDelete?: (edgeId: string) => void
}

function DenyBranchEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgeData = data as DenyEdgeData | undefined

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className="stroke-red-400 stroke-[2px]"
        style={{ strokeDasharray: '4,4' }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-medium text-red-500 bg-white dark:bg-black px-1 py-0.5 rounded border border-red-200 dark:border-red-800">
              DENY
            </span>
            {selected && edgeData?.onDenyBranchDelete && (
              <Button
                size="icon-xs"
                variant="ghost"
                className="size-4 rounded-full p-0 text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                onClick={(e) => {
                  e.stopPropagation()
                  edgeData?.onDenyBranchDelete?.(id)
                }}
              >
                <X className="size-2.5" />
              </Button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const DenyBranchEdge = memo(DenyBranchEdgeComponent)
