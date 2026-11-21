import { describe, expect, it } from 'vitest'
import { resolveExamFormSession } from '@/features/lms/classes/exam-form-session'
import type { ExamFormJson } from '@/features/lms/types/exam-result'

const template: ExamFormJson = {
  examName: 'Midterm', examType: 1, overall: [],
  academic: [{ name: 'Speaking', weight: '10', score: '0' }],
}
const unsaved = { scores: null, comment: '' }

describe('exam form session identity', () => {
  it('changes the synchronization session between ungraded students even with the same template reference', () => {
    const first = resolveExamFormSession('class::first::1', template, null, unsaved)
    const edited = { ...first, scores: { ...template, academic: [{ ...template.academic[0], score: '9' }] }, comment: 'First student' }
    const second = resolveExamFormSession('class::second::1', template, null, unsaved)
    expect(second.key).not.toBe(edited.key)
    expect(second.scores).toBe(first.scores)
    expect(second.scores?.academic[0].score).toBe('0')
    expect(second.comment).toBe('')
    expect(second.restored).toBe(false)
  })

  it('restores the selected student draft ahead of saved data and the template', () => {
    const draft = { scores: { ...template, examName: 'Draft' }, comment: 'Draft comment' }
    const saved = { scores: { ...template, examName: 'Saved' }, comment: 'Saved comment' }
    expect(resolveExamFormSession('student', template, draft, saved)).toMatchObject({ ...draft, restored: true })
    expect(resolveExamFormSession('student', template, null, saved)).toMatchObject({ ...saved, restored: false })
  })

  it('has no scores when no student form data is available', () => {
    expect(resolveExamFormSession(null, null, null, unsaved)).toEqual({ key: null, scores: null, comment: '', restored: false })
  })
})
