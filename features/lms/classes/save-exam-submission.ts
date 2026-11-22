import { useExamDraftStore } from '@/features/lms/stores/use-exam-draft-store'

export async function saveExamSubmission(
  key: string,
  save: () => Promise<unknown>,
  canClear: () => boolean = () => true,
): Promise<boolean> {
  const store = useExamDraftStore
  const { name, storage } = store.persist.getOptions()
  const submitted = store.getState().getDraft(key)
  const signature = JSON.stringify(submitted)
  await save()
  if (!submitted || !name) return false

  const persisted = await storage?.getItem(name)
  const persistedDraft = persisted?.state.drafts[key]
  if (!canClear() || (persistedDraft && JSON.stringify(persistedDraft) !== signature)) return false

  if (store.persist.getOptions().name === name) {
    if (JSON.stringify(store.getState().getDraft(key)) !== signature) return false
    store.getState().clearDraft(key)
  } else if (persisted && persistedDraft) {
    const drafts = { ...persisted.state.drafts }
    delete drafts[key]
    await storage?.setItem(name, { ...persisted, state: { ...persisted.state, drafts } })
  }
  return true
}
