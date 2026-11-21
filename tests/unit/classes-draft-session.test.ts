import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let storage: Storage
beforeEach(() => {
  const values = new Map<string, string>()
  storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size },
  }
  vi.stubGlobal('window', { localStorage: storage })
})
afterEach(() => vi.unstubAllGlobals())

async function openTab(identity: string) {
  vi.resetModules()
  const { prepareClassDraftSession } = await import('@/features/lms/classes/draft-session')
  const { useExamDraftStore: exams } = await import('@/features/lms/stores/use-exam-draft-store')
  const { useReportDraftStore: reports } = await import('@/features/lms/stores/use-report-draft-store')
  prepareClassDraftSession(identity, storage)
  return { exams, reports, prepareClassDraftSession }
}

const scores = { examName: 'Midterm', examType: 1, overall: [], academic: [] }
describe('Classes draft persistence isolation', () => {
  it('isolates a second account from a first tab that continues writing', async () => {
    const first = await openTab('teacher-1')
    first.exams.getState().saveDraft('exam', scores, 'First teacher')
    first.reports.getState().saveDraft('lesson', [])
    const second = await openTab('teacher-2')
    expect(second.exams.getState().drafts).toEqual({})
    expect(second.reports.getState().drafts).toEqual({})
    second.exams.getState().saveDraft('exam', scores, 'Second teacher')
    first.exams.getState().saveDraft('exam', scores, 'Late first-tab write')
    first.reports.getState().saveDraft('late-lesson', [])
    const reopened = await openTab('teacher-2')
    expect(reopened.exams.getState().getDraft('exam')?.comment).toBe('Second teacher')
    expect(reopened.reports.getState().drafts).toEqual({})
    const original = await openTab('teacher-1')
    expect(original.exams.getState().getDraft('exam')?.comment).toBe('Late first-tab write')
    expect(original.reports.getState().hasDraft('late-lesson')).toBe(true)
  })

  it('discards legacy unscoped drafts and does not persist signed-out edits', async () => {
    storage.setItem('geeo-exam-drafts', JSON.stringify({ state: { drafts: { old: {} } }, version: 0 }))
    const tab = await openTab('teacher-1')
    expect(tab.exams.getState().drafts).toEqual({})
    tab.exams.getState().saveDraft('exam', scores, 'Private')
    tab.prepareClassDraftSession('', storage)
    expect(tab.exams.getState().drafts).toEqual({})
    tab.exams.getState().saveDraft('anonymous', scores, 'Do not persist')
    expect(storage.getItem('geeo-exam-drafts:')).toBeNull()
    tab.prepareClassDraftSession('teacher-2', storage)
    expect(tab.exams.getState().drafts).toEqual({})
  })

  it('retains current-account edits when another Classes window opens', async () => {
    const tab = await openTab('teacher-1')
    tab.exams.getState().saveDraft('exam', scores, 'Keep')
    tab.prepareClassDraftSession('teacher-1', storage)
    expect(tab.exams.getState().getDraft('exam')?.comment).toBe('Keep')
  })

  it('starts empty on corrupt or unavailable storage without retaining the prior account', async () => {
    const tab = await openTab('teacher-1')
    tab.exams.getState().saveDraft('exam', scores, 'Private')
    storage.setItem('geeo-exam-drafts:teacher-2', 'invalid JSON')
    tab.prepareClassDraftSession('teacher-2', storage)
    expect(tab.exams.getState().drafts).toEqual({})
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('denied') })
    tab.prepareClassDraftSession('teacher-3', storage)
    expect(tab.exams.getState().drafts).toEqual({})
    expect(() => tab.exams.getState().saveDraft('exam', scores, 'Memory only')).not.toThrow()
  })
})
