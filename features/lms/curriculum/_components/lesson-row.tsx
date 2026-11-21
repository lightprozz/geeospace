'use client'
// ---------------------------------------------------------------------------
// _components/lesson-row.tsx
// Single row in the LessonTable — pure rendering, all actions via props
// PERF: React.memo to prevent re-render of all rows on single checkbox toggle
// PERF: useRouter lifted to parent — row receives onNavigate callback
// ---------------------------------------------------------------------------

import { memo } from 'react'
import { Eye, Paperclip, Pencil, Trash2, FileText } from 'lucide-react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePermission } from '@/features/lms/port-support'
import type { LessonListItem } from '@/features/lms/types/curriculum'

interface LessonRowProps {
  lesson: LessonListItem
  isChecked: boolean
  onCheck: (id: string, checked: boolean) => void
  onEdit: (lesson: LessonListItem) => void
  onDelete: (id: string) => void
  onUploadWorksheet: (id: string) => void
  onNavigate: (path: string) => void
}

export const LessonRow = memo(function LessonRow({
  lesson,
  isChecked,
  onCheck,
  onEdit,
  onDelete,
  onUploadWorksheet,
  onNavigate,
}: LessonRowProps) {
  const { can } = usePermission()
  const canUpdateLesson = can('curriculum.update')
  const canDeleteLesson = can('curriculum.delete')

  return (
    <TableRow className={isChecked ? 'bg-muted/40' : undefined}>
      {/* Checkbox */}
      <TableCell className="w-10 pr-0">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => onCheck(lesson.id, !!checked)}
          aria-label={`Select lesson ${lesson.lesson}`}
        />
      </TableCell>

      {/* Level (from DTO join) */}
      <TableCell className="w-36">
        <Badge variant="outline" className="text-xs font-normal truncate max-w-[120px]">
          {lesson.level}
        </Badge>
      </TableCell>

      {/* Lesson number */}
      <TableCell className="w-20 text-center font-mono text-sm font-semibold">
        {lesson.lesson}
      </TableCell>

      {/* Subject */}
      <TableCell className="max-w-[180px]">
        <p className="truncate text-sm font-medium">{lesson.subject ?? '—'}</p>
      </TableCell>

      {/* Content — plain text with whitespace-pre-wrap (DO NOT dangerouslySetInnerHTML) */}
      <TableCell className="max-w-[200px]">
        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
          {lesson.content ?? '—'}
        </p>
      </TableCell>

      {/* TB (Textbook) */}
      <TableCell className="w-20 text-center text-xs text-muted-foreground">
        {lesson.tb ?? '—'}
      </TableCell>

      {/* Worksheet */}
      <TableCell className="w-16 text-center">
        {lesson.worksheetFileName ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center">
                <FileText className="h-4 w-4 text-emerald-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{lesson.worksheetFileName}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-36">
        <div className="flex items-center gap-0.5">
          {/* View Units */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  onNavigate(`/curriculum/lessons/${lesson.id}/units`)
                }
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">View Units</p></TooltipContent>
          </Tooltip>

          {/* View Content */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  onNavigate(`/curriculum/lessons/${lesson.id}/content`)
                }
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Lesson Content</p></TooltipContent>
          </Tooltip>

          {/* Upload Worksheet */}
          {canUpdateLesson && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onUploadWorksheet(lesson.id)}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Upload Worksheet</p></TooltipContent>
            </Tooltip>
          )}

          {/* Edit */}
          {canUpdateLesson && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(lesson)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Edit</p></TooltipContent>
            </Tooltip>
          )}

          {/* Delete */}
          {canDeleteLesson && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(lesson.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Delete</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})
