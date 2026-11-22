import { describe, expect, it } from 'vitest'
import { hasWorklogEditableChanges } from '@/features/lms/classes/worklog-edits'
import { WorkLogStatusV2 } from '@/features/lms/types/worklog'

const approved = { id: 'approved', status: WorkLogStatusV2.Accepted, score: 1, comment: null, evaluate: false, order: 0 }

describe('worklog update selection', () => {
  it('skips an unchanged approved row so a later changed row can be updated', () => {
    const pending = { ...approved, id: 'pending', status: WorkLogStatusV2.Waitting }
    const drafts = [{ ...approved, comment: '' }, { ...pending, score: 2 }]
    const originals = new Map([approved, pending].map(row => [row.id, row]))
    const updates = drafts.filter(draft => hasWorklogEditableChanges(originals.get(draft.id)!, draft))
    expect(updates.map(row => row.id)).toEqual(['pending'])
  })

  it.each([{ score: 2 }, { comment: 'Updated' }, { evaluate: true }, { order: 1 }])('updates changed editable fields: %o', changes => {
    expect(hasWorklogEditableChanges(approved, { ...approved, ...changes })).toBe(true)
  })

  it('normalizes absent comments and leaves immutable/read-only changes to the replacement path', () => {
    expect(hasWorklogEditableChanges(approved, { ...approved, comment: undefined })).toBe(false)
    const metadataOnly = { ...approved, updatedAt: 'later', isEvent: true }
    expect(hasWorklogEditableChanges(approved, metadataOnly)).toBe(false)
    expect([].filter(row => hasWorklogEditableChanges(approved, row))).toEqual([])
  })
})
