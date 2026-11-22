import { describe, expect, it } from 'vitest'
import { editAttendanceCriterion, editAttendanceField, restoreAttendanceDrafts, type AttendanceDraft } from '@/features/lms/classes/attendance-drafts'

const original: AttendanceDraft = { id: 'student-1', present: 1, starScore: 2, note: 'Old note', criteria: { 1: 2, 2: 3 } }
const fresh: AttendanceDraft = { id: 'student-1', present: 2, starScore: 5, note: 'New server note', criteria: { 1: 4, 2: 5, 3: 3 } }

describe('attendance draft restoration', () => {
  it('overrides only the edited field, not stale attendance, stars or assessment scores', () => {
    const draft = editAttendanceField(original, 'note', 'Teacher edit')
    expect(restoreAttendanceDrafts([fresh], [draft])[0]).toMatchObject({
      ...fresh, note: 'Teacher edit', editedFields: { note: true },
    })
  })

  it('tracks attendance, stars, clearing notes and individual criteria independently', () => {
    let draft = editAttendanceField(original, 'present', 0)
    draft = editAttendanceField(draft, 'starScore', 0)
    draft = editAttendanceField(draft, 'note', '')
    draft = editAttendanceCriterion(draft, 1, 0)
    const restored = restoreAttendanceDrafts([fresh], JSON.parse(JSON.stringify([draft])))[0]
    expect(restored).toMatchObject({ present: 0, starScore: 0, note: '', criteria: { 1: 0, 2: 5, 3: 3 } })
    expect(fresh.criteria[1]).toBe(4)
    const restoredAgain = restoreAttendanceDrafts([{ ...fresh, criteria: { 1: 5, 2: 1 } }], [restored])[0]
    expect(restoredAgain.criteria).toEqual({ 1: 0, 2: 1 })
  })

  it('does not infer edited fields from legacy snapshots or equal-value events', () => {
    expect(restoreAttendanceDrafts([fresh], [original])[0]).toMatchObject(fresh)
    expect(editAttendanceField(original, 'present', original.present)).toBe(original)
    expect(editAttendanceCriterion(original, 1, original.criteria[1])).toBe(original)
  })

  it('handles empty drafts and changed rosters without restoring removed students', () => {
    const added = { ...fresh, id: 'student-2' }
    expect(restoreAttendanceDrafts([added], [original])).toEqual([added])
    expect(restoreAttendanceDrafts([fresh], [])).toEqual([fresh])
    expect(restoreAttendanceDrafts([], [original])).toEqual([])
  })
})
