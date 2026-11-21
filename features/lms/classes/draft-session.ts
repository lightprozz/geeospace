import { useExamDraftStore } from '@/features/lms/stores/use-exam-draft-store'
import { useReportDraftStore } from '@/features/lms/stores/use-report-draft-store'
import { useClassStore } from '@/features/lms/stores/use-class-store'

export const CLASS_DRAFT_OWNER_KEY = 'geeo.classes.draft-owner'

export function clearClassDrafts() {
  useExamDraftStore.getState().clearAllDrafts()
  useReportDraftStore.getState().clearAllDrafts()
  useClassStore.getState().closeClass()
}

export function prepareClassDraftSession(identity: string, storage: Pick<Storage, 'getItem' | 'setItem'>) {
  if (storage.getItem(CLASS_DRAFT_OWNER_KEY) !== identity) clearClassDrafts()
  storage.setItem(CLASS_DRAFT_OWNER_KEY, identity)
}
