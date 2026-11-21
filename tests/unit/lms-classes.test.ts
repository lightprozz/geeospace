import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseClassPath } from '@/features/lms/classes/navigation'
import { shortenName } from '@/features/lms/classes/shorten-name'
import { A4Page } from '@/features/lms/classes/exam-print-templates/a4-page'
import { DefaultTemplate } from '@/features/lms/classes/exam-print-templates/default-template'
import type { PrintTemplateProps } from '@/features/lms/types/exam-result'
import { CLASS_DRAFT_OWNER_KEY, prepareClassDraftSession } from '@/features/lms/classes/draft-session'
import { useExamDraftStore } from '@/features/lms/stores/use-exam-draft-store'
import { useReportDraftStore } from '@/features/lms/stores/use-report-draft-store'

afterEach(() => vi.restoreAllMocks())

describe('Classes draft identity isolation', () => {
  it.each([null, 'another-user'])('clears unowned or other-account drafts (%s)', owner => {
    const exams = vi.spyOn(useExamDraftStore.getState(), 'clearAllDrafts').mockImplementation(() => {})
    const reports = vi.spyOn(useReportDraftStore.getState(), 'clearAllDrafts').mockImplementation(() => {})
    const storage = { getItem: () => owner, setItem: vi.fn() }
    prepareClassDraftSession('teacher-1', storage)
    expect(exams).toHaveBeenCalledOnce()
    expect(reports).toHaveBeenCalledOnce()
    expect(storage.setItem).toHaveBeenCalledWith(CLASS_DRAFT_OWNER_KEY, 'teacher-1')
  })
  it('keeps drafts for the same identity and surfaces storage failures to the host', () => {
    const exams = vi.spyOn(useExamDraftStore.getState(), 'clearAllDrafts').mockImplementation(() => {})
    const reports = vi.spyOn(useReportDraftStore.getState(), 'clearAllDrafts').mockImplementation(() => {})
    prepareClassDraftSession('teacher-1', { getItem: () => 'teacher-1', setItem: () => {} })
    expect(exams).not.toHaveBeenCalled()
    expect(reports).not.toHaveBeenCalled()
    expect(() => prepareClassDraftSession('teacher-1', { getItem: () => { throw new Error('Storage denied') }, setItem: () => {} })).toThrow('Storage denied')
  })
})

describe('Classes window navigation', () => {
  it('maps list, detail and tab paths', () => {
    expect(parseClassPath('')).toEqual({ classId: null, tab: 'lessons' })
    expect(parseClassPath('class-1')).toEqual({ classId: 'class-1', tab: 'lessons' })
    for (const tab of ['lessons', 'students', 'reports', 'exams', 'events']) {
      expect(parseClassPath(`class-1/${tab}`)).toEqual({ classId: 'class-1', tab })
    }
  })
  it('rejects unsupported or nested tab paths', () => {
    expect(parseClassPath('class-1/unknown').classId).toBeNull()
    expect(parseClassPath('class-1/exams/extra').classId).toBeNull()
  })
})

it('shortens long names without losing the first and last names', () => {
  expect(shortenName(null)).toBe('')
  expect(shortenName(' Mai Nguyen ')).toBe('Mai Nguyen')
  expect(shortenName('Nguyễn Phạm Nhật Vượng')).toBe('Nguyễn P. N. Vượng')
})

describe('A4 exam print', () => {
  it('renders fixed paper dimensions and page numbers', () => {
    const html = renderToStaticMarkup(createElement(A4Page, { pageNumber: 1, totalPages: 2 } as ComponentProps<typeof A4Page>, 'Exam'))
    expect(html).toContain('width:210mm')
    expect(html).toContain('min-height:297mm')
    expect(html).toContain('Page 1 / 2')
  })
  it('renders exam identity, scores and comment pages, including an empty comment', () => {
    const props: PrintTemplateProps = {
      student: { name: 'Linh Nguyen', englishName: 'Lily' }, className: 'Starters A',
      mainTeacher: 'Mai Nguyen', coTeacher: '', startDate: '2026-01-01', examTitle: 'Midterm',
      overallScores: [], academicScores: [{ subjectName: 'Speaking', score: 9, maxScore: 10 }],
      totalPercent: 90, resultLabel: 'VERY GOOD', comment: '', evaluationScales: [],
    }
    const empty = renderToStaticMarkup(createElement(DefaultTemplate, props))
    expect(empty).toContain('Linh Nguyen')
    expect(empty).toContain('Starters A')
    expect(empty).toContain('Speaking')
    expect(empty).not.toContain('NaN')
    const comment = renderToStaticMarkup(createElement(DefaultTemplate, { ...props, comment: '<p>Great progress!</p>' }))
    expect(comment).toContain('Great progress!')
    expect(comment.match(/width:210mm/g)?.length).toBeGreaterThan(1)
  })
})
