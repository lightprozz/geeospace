import { describe, expect, it } from 'vitest'
import { resolveExamFormSession } from '@/features/lms/classes/exam-form-session'
import type { ExamFormJson } from '@/features/lms/types/exam-result'

const template: ExamFormJson = {
  examName: 'Midterm', examType: 1, overall: [],
  academic: [{ name: 'Speaking', weight: '10', score: '0' }],
}
const unsaved = { scores: null, comment: '' }
const noDraft = () => undefined

describe('exam form session identity', () => {
  it('changes the synchronization session between ungraded students even with the same template reference', () => {
    const first = resolveExamFormSession('class::first::1', template, noDraft, unsaved)
    const edited = { ...first, scores: { ...template, academic: [{ ...template.academic[0], score: '9' }] }, comment: 'First student' }
    const second = resolveExamFormSession('class::second::1', template, noDraft, unsaved)
    expect(second.key).not.toBe(edited.key)
    expect(second.scores).toBe(first.scores)
    expect(second.scores?.academic[0].score).toBe('0')
    expect(second.comment).toBe('')
    expect(second.restored).toBe(false)
  })

  it('restores the selected student draft ahead of saved data and the template', () => {
    const draft = { scores: { ...template, examName: 'Draft' }, comment: 'Draft comment' }
    const saved = { scores: { ...template, examName: 'Saved' }, comment: 'Saved comment' }
    expect(resolveExamFormSession('student', template, () => draft, saved)).toMatchObject({ ...draft, restored: true })
    expect(resolveExamFormSession('student', template, noDraft, saved)).toMatchObject({ ...saved, restored: false })
  })

  it('uses the submitted draft during save and the saved result after clearing, never the selection-time snapshot', () => {
    const stale = { scores: { ...template, academic: [{ ...template.academic[0], score: '2' }] }, comment: 'Old draft' }
    const submitted = { scores: { ...template, academic: [{ ...template.academic[0], score: '9' }] }, comment: 'Saved edits' }
    const drafts = new Map([['student', stale]])
    const getDraft = (key: string) => drafts.get(key)
    expect(resolveExamFormSession('student', template, getDraft, unsaved).scores).toBe(stale.scores)
    drafts.set('student', submitted)
    expect(resolveExamFormSession('student', template, getDraft, submitted)).toMatchObject({ ...submitted, restored: true })
    drafts.delete('student')
    expect(resolveExamFormSession('student', template, getDraft, submitted)).toMatchObject({ ...submitted, restored: false })
    expect(resolveExamFormSession('student', template, getDraft, { ...submitted })).toMatchObject({ ...submitted, restored: false })
    expect(drafts.size).toBe(0)
  })

  it('has no scores when no student form data is available', () => {
    expect(resolveExamFormSession(null, null, noDraft, unsaved)).toEqual({ key: null, scores: null, comment: '', restored: false })
  })
})
