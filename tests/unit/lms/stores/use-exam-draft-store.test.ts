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

async function openTab(name = 'geeo-exam-drafts') {
  vi.resetModules()
  const { useExamDraftStore } = await import('@/features/lms/stores/use-exam-draft-store')
  useExamDraftStore.persist.setOptions({ name })
  await useExamDraftStore.persist.rehydrate()
  return useExamDraftStore
}

const scores = { examName: 'Midterm', examType: 1, overall: [], academic: [] }
const x = 'class::student-x::1'
const y = 'class::student-y::1'

describe.each(['geeo-exam-drafts', 'geeo-exam-drafts:teacher-1'])('exam draft writes in %s', name => {
  it.each(['clear', 'save'])('preserves another tab’s student X draft when a stale tab performs %s on student Y', async action => {
    const first = await openTab(name)
    first.getState().saveDraft(y, scores, 'Original Y')
    const second = await openTab(name)
    second.getState().saveDraft(x, scores, 'New X')
    expect(first.getState().hasDraft(x)).toBe(false)

    if (action === 'clear') first.getState().clearDraft(y)
    else first.getState().saveDraft(y, scores, 'Updated Y')

    expect(JSON.parse(storage.getItem(name)!).state.drafts[x].comment).toBe('New X')
    const reloaded = await openTab(name)
    expect(reloaded.getState().getDraft(x)?.comment).toBe('New X')
    expect(reloaded.getState().getDraft(y)?.comment).toBe(action === 'clear' ? undefined : 'Updated Y')
  })

  it('does not resurrect another tab’s deleted drafts when saving a different key', async () => {
    const first = await openTab(name)
    first.getState().saveDraft(x, scores, 'X')
    const second = await openTab(name)
    second.getState().clearDraft(x)
    first.getState().saveDraft(y, scores, 'Y')
    const reloaded = await openTab(name)
    expect(reloaded.getState().hasDraft(x)).toBe(false)
    expect(reloaded.getState().hasDraft(y)).toBe(true)
  })

  it('allows clearing a missing key and intentionally clearing all shared drafts', async () => {
    const first = await openTab(name)
    const second = await openTab(name)
    second.getState().saveDraft(x, scores, 'X')
    first.getState().clearDraft(y)
    expect(first.getState().hasDraft(x)).toBe(true)
    first.getState().clearAllDrafts()
    const reloaded = await openTab(name)
    expect(reloaded.getState().drafts).toEqual({})
  })
})

it('keeps in-memory edits usable when persisted storage is corrupt or unavailable', async () => {
  const tab = await openTab()
  tab.getState().saveDraft(x, scores, 'X')
  storage.setItem('geeo-exam-drafts', 'invalid JSON')
  tab.getState().saveDraft(y, scores, 'Y')
  expect(tab.getState().hasDraft(x)).toBe(true)
  vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('Denied') })
  tab.getState().clearDraft(y)
  expect(tab.getState().hasDraft(x)).toBe(true)
  expect(tab.getState().hasDraft(y)).toBe(false)
})
