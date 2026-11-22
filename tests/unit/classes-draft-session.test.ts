import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MutationObserver, QueryClient } from '@tanstack/react-query'

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
  const { saveExamSubmission } = await import('@/features/lms/classes/save-exam-submission')
  prepareClassDraftSession(identity, storage)
  return { exams, reports, prepareClassDraftSession, saveExamSubmission }
}

const scores = { examName: 'Midterm', examType: 1, overall: [], academic: [] }

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('exam submission cleanup', () => {
  it('clears a submitted draft after unrelated writes refresh its object identity, preserving another tab’s drafts', async () => {
    const first = await openTab('teacher-1')
    first.exams.getState().saveDraft('submitted', scores, 'Saved grade')
    const submitted = first.exams.getState().getDraft('submitted')
    const response = deferred()
    const saving = first.saveExamSubmission('submitted', () => response.promise)
    const second = await openTab('teacher-1')
    second.exams.getState().saveDraft('other-student', scores, 'Other teacher edits')
    first.exams.getState().saveDraft('local-student', scores, 'Local edits')
    expect(first.exams.getState().getDraft('submitted')).not.toBe(submitted)
    response.resolve()
    expect(await saving).toBe(true)
    const reloaded = await openTab('teacher-1')
    expect(reloaded.exams.getState().hasDraft('submitted')).toBe(false)
    expect(reloaded.exams.getState().getDraft('other-student')?.comment).toBe('Other teacher edits')
    expect(reloaded.exams.getState().getDraft('local-student')?.comment).toBe('Local edits')
  })

  it('clears a saved draft after the mutation observer unmounts before the response', async () => {
    const tab = await openTab('teacher-1')
    const key = 'class-1::student-1::1'
    tab.exams.getState().saveDraft(key, scores, 'Submitted')
    const response = deferred()
    const client = new QueryClient()
    const observer = new MutationObserver(client, { mutationFn: () => response.promise })
    const unsubscribe = observer.subscribe(() => {})
    const observerSuccess = vi.fn()
    const saving = tab.saveExamSubmission(key, () => observer.mutate(undefined, { onSuccess: observerSuccess }))
    unsubscribe()
    response.resolve()
    expect(await saving).toBe(true)
    expect(observerSuccess).not.toHaveBeenCalled()
    expect(tab.exams.getState().hasDraft(key)).toBe(false)
    const reloaded = await openTab('teacher-1')
    expect(reloaded.exams.getState().hasDraft(key)).toBe(false)
    client.clear()
  })

  it('retains a newer persisted draft or pending local edits made after submitting', async () => {
    const tab = await openTab('teacher-1')
    tab.exams.getState().saveDraft('exam', scores, 'Submitted')
    const response = deferred()
    const saving = tab.saveExamSubmission('exam', () => response.promise)
    tab.exams.getState().saveDraft('exam', scores, 'New edits')
    response.resolve()
    expect(await saving).toBe(false)
    expect(tab.exams.getState().getDraft('exam')?.comment).toBe('New edits')
    expect(await tab.saveExamSubmission('exam', async () => {}, () => false)).toBe(false)
    expect(tab.exams.getState().hasDraft('exam')).toBe(true)
  })

  it('cleans the submitted account namespace after an identity switch without touching the new account', async () => {
    const tab = await openTab('teacher-1')
    tab.exams.getState().saveDraft('exam', scores, 'First account')
    const response = deferred()
    const saving = tab.saveExamSubmission('exam', () => response.promise)
    tab.prepareClassDraftSession('teacher-2', storage)
    tab.exams.getState().saveDraft('exam', scores, 'Second account')
    response.resolve()
    expect(await saving).toBe(true)
    expect(tab.exams.getState().getDraft('exam')?.comment).toBe('Second account')
    tab.prepareClassDraftSession('teacher-1', storage)
    expect(tab.exams.getState().hasDraft('exam')).toBe(false)
  })

  it('preserves edits made in another tab while the save was pending', async () => {
    const first = await openTab('teacher-1')
    first.exams.getState().saveDraft('exam', scores, 'Submitted')
    const response = deferred()
    const saving = first.saveExamSubmission('exam', () => response.promise)
    const second = await openTab('teacher-1')
    second.exams.getState().saveDraft('exam', scores, 'Other tab edit')
    response.resolve()
    expect(await saving).toBe(false)
    const reloaded = await openTab('teacher-1')
    expect(reloaded.exams.getState().getDraft('exam')?.comment).toBe('Other tab edit')
  })

  it('keeps the submitted draft on failure and tolerates an already removed draft', async () => {
    const tab = await openTab('teacher-1')
    tab.exams.getState().saveDraft('exam', scores, 'Retry me')
    await expect(tab.saveExamSubmission('exam', async () => { throw new Error('Failed') })).rejects.toThrow('Failed')
    expect(tab.exams.getState().getDraft('exam')?.comment).toBe('Retry me')
    expect(await tab.saveExamSubmission('missing', async () => {})).toBe(false)
  })
})

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
