'use client'
// ---------------------------------------------------------------------------
// _components/exam-template-card.tsx
// Single exam template editor card
// Parses examFormJson string → local state → re-serializes on every change
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
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
import { ExamOverallTable } from './exam-overall-table'
import { ExamAcademicTable } from './exam-academic-table'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { DEFAULT_EXAM_FORM } from '@/features/lms/types/curriculum'
import type { ExamFormItemRequest, ExamFormJson } from '@/features/lms/types/curriculum'

function parseExamFormJson(json: string): ExamFormJson {
  try {
    return JSON.parse(json) as ExamFormJson
  } catch {
    return { ...DEFAULT_EXAM_FORM }
  }
}

interface ExamTemplateCardProps {
  form: ExamFormItemRequest
  index: number          // 0-based (displayed as 1-based)
  onChange: (updated: ExamFormItemRequest) => void
  onDelete: (id: string) => void
}

export function ExamTemplateCard({
  form,
  index,
  onChange,
  onDelete,
}: ExamTemplateCardProps) {
  const { can } = usePermission()
  const canDeleteTemplate = can(PERMISSIONS.CURRICULUM_DELETE)

  const [parsed, setParsed] = useState<ExamFormJson>(() =>
    parseExamFormJson(form.examFormJson || ''),
  )
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleUpdate(updated: ExamFormJson) {
    setParsed(updated)
    onChange({ ...form, examName: updated.examName, examFormJson: JSON.stringify(updated) })
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs shrink-0">
              Template {index + 1}
            </Badge>
            <div className="flex-1">
              <Label htmlFor={`exam-name-${form.id}`} className="text-xs mb-1 block text-muted-foreground">
                Exam Name
              </Label>
              <Input
                id={`exam-name-${form.id}`}
                value={parsed.examName}
                onChange={(e) =>
                  handleUpdate({ ...parsed, examName: e.target.value })
                }
                placeholder="e.g. Mid-term Exam"
                className="h-8 text-sm"
              />
            </div>
            {canDeleteTemplate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Overall Assessment */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Overall Assessment
            </p>
            <ExamOverallTable
              items={parsed.overall}
              onChange={(items) => handleUpdate({ ...parsed, overall: items })}
            />
          </div>

          <Separator />

          {/* Academic Scoring */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Academic Scoring
            </p>
            <ExamAcademicTable
              items={parsed.academic}
              onChange={(items) => handleUpdate({ ...parsed, academic: items })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove exam template?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{parsed.examName || `Template ${index + 1}`}</strong> will be removed
              from the local list. Click &quot;Save All Templates&quot; to persist this change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onDelete(form.id as string); setDeleteOpen(false) }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
