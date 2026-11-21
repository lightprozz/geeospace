'use client'

import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { ProcessAction, HttpMethod } from '../types/trigger'
import { PROCESS_ACTION_LABELS, normalizeProcessAction } from '../types/trigger'

interface TriggerCardProps {
  id: string
  processId: string
  triggerName: string
  processAction: ProcessAction
  httpMethod: HttpMethod
  apiUrl: string
  isConditionTrigger: boolean
  // Caller drives canManage via the parent page (FE permission gate). BE
  // requires FormsTemplateAdmin for PUT/DELETE/test-fire, so write-only users
  // get read-only views. Default true preserves backward-compat for any
  // test/page that wires all callbacks.
  canManage?: boolean
  onEdit: () => void
  onDelete?: () => void
  onTestFire?: () => void
}

export function TriggerCard({
  triggerName,
  processAction,
  httpMethod,
  apiUrl,
  isConditionTrigger,
  canManage = true,
  onEdit,
  onDelete,
  onTestFire,
}: TriggerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-1 items-center gap-3">
          <span className="font-medium">{triggerName}</span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {httpMethod}
          </span>
          <span className="text-xs text-muted-foreground">
            {PROCESS_ACTION_LABELS[normalizeProcessAction(processAction) as ProcessAction]
              ?? processAction}
          </span>
          {isConditionTrigger && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                Có điều kiện
              </span>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1 hover:bg-muted"
          aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded p-1 hover:bg-muted"
              aria-label="Menu thao tác"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border bg-popover shadow-md">
                <button
                  onClick={() => { onEdit(); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Sửa
                </button>
                <button
                  onClick={() => { onTestFire!(); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Chạy thử
                </button>
                <button
                  onClick={() => { onDelete!(); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Xoá
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t px-4 py-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Đường dẫn:</span> <code className="rounded bg-muted px-1">{apiUrl}</code>
          </div>
        </div>
      )}
    </div>
  )
}
