import { describe, expect, it } from 'vitest'
import { selectTeacherShift, withMissingTeacherDrafts } from '@/features/lms/classes/worklog-teacher-drafts'
import { ShiftTypeConstant } from '@/features/lms/types/worklog'

interface Row {
  id: string | null
  teacherId: string
  subsForTeacherId: string
  isExpat: boolean
  effortType: string
  score: number
}
const createDraft = (teacherId: string): Row => ({ id: null, teacherId, subsForTeacherId: '', isExpat: false, effortType: '', score: 0 })
const saved: Row = { ...createDraft('teacher-1'), id: 'saved-1', effortType: 'main_teacher' }

describe('teacher worklog draft rows', () => {
  it.each([ShiftTypeConstant.Alone, ShiftTypeConstant.AloneExpat])('does not create untouched default rows after selecting %s', effortType => {
    const defaults = withMissingTeacherDrafts([], ['teacher-1', 'teacher-2'], createDraft)
    const selected = selectTeacherShift(defaults, 'teacher-1', effortType, 2)
    expect(selected[1]).toBe(defaults[1])
    expect(selected[1].effortType).toBe('')
    expect(selected.filter(row => !row.id && row.effortType).map(row => row.teacherId)).toEqual(['teacher-1'])
    const reloaded = withMissingTeacherDrafts([{ ...selected[0], id: 'saved-1' }], ['teacher-1', 'teacher-2'], createDraft)
    expect(selectTeacherShift(reloaded, 'teacher-1', effortType, 2)[1].effortType).toBe('')
  })

  it('still permits explicitly selected Off shifts and changes populated teacher shifts to Off for solo teaching', () => {
    const defaults = [createDraft('teacher-1'), createDraft('teacher-2')]
    const selectedOff = selectTeacherShift(defaults, 'teacher-2', ShiftTypeConstant.Off, 0)
    expect(selectedOff[1].effortType).toBe(ShiftTypeConstant.Off)
    const solo = selectTeacherShift([defaults[0], { ...saved, teacherId: 'teacher-2' }], 'teacher-1', ShiftTypeConstant.Alone, 2)
    expect(solo[1]).toMatchObject({ id: saved.id, effortType: ShiftTypeConstant.Off })
    expect(selectTeacherShift([], 'teacher-1', ShiftTypeConstant.Alone, 2)).toEqual([])
  })

  it('preserves unrelated substitute and expat rows while removing a substitute for the selected active teacher', () => {
    const substitute = { ...saved, id: 'sub', teacherId: 'substitute', subsForTeacherId: 'teacher-1' }
    const otherSubstitute = { ...substitute, id: 'other-sub', subsForTeacherId: 'teacher-2' }
    const expat = { ...saved, id: 'expat', teacherId: 'expat', isExpat: true }
    const rows = selectTeacherShift([createDraft('teacher-1'), substitute, otherSubstitute, expat], 'teacher-1', ShiftTypeConstant.Alone, 2)
    expect(rows).toHaveLength(3)
    expect(rows.slice(1)).toEqual([otherSubstitute, expat])
  })

  it('keeps an editor row for a teacher without shifts after another teacher saves', () => {
    const rows = withMissingTeacherDrafts([saved], ['teacher-1', 'teacher-2'], createDraft)
    expect(rows).toEqual([saved, createDraft('teacher-2')])
    expect(rows[0]).toBe(saved)
  })

  it('creates defaults for an empty response and deduplicates class teachers', () => {
    expect(withMissingTeacherDrafts([], ['teacher-1', 'teacher-1', 'teacher-2'], createDraft)).toEqual([
      createDraft('teacher-1'), createDraft('teacher-2'),
    ])
    expect(withMissingTeacherDrafts([], [], createDraft)).toEqual([])
  })

  it('preserves saved substitutes and expats without treating them as main teacher rows', () => {
    const substitute = { ...saved, id: 'substitute', teacherId: 'teacher-2', subsForTeacherId: 'teacher-1' }
    const expat = { ...saved, id: 'expat', teacherId: 'teacher-3', isExpat: true }
    expect(withMissingTeacherDrafts([saved, substitute, expat], ['teacher-1', 'teacher-2', 'teacher-3'], createDraft)).toEqual([
      saved, substitute, expat, createDraft('teacher-2'), createDraft('teacher-3'),
    ])
  })

  it('does not duplicate already represented teacher rows or discard saved teachers absent from the roster', () => {
    expect(withMissingTeacherDrafts([saved], ['teacher-1'], createDraft)).toEqual([saved])
    expect(withMissingTeacherDrafts([saved], [], createDraft)).toEqual([saved])
  })
})
