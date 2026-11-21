import type { WorkLogItemV2 } from '@/features/lms/types/worklog'

type EditableWorklogFields = Pick<WorkLogItemV2, 'score' | 'comment' | 'evaluate' | 'order'>

export function hasWorklogEditableChanges(original: EditableWorklogFields, draft: EditableWorklogFields): boolean {
  return original.score !== draft.score ||
    (original.comment ?? '') !== (draft.comment ?? '') ||
    original.evaluate !== draft.evaluate ||
    original.order !== draft.order
}
