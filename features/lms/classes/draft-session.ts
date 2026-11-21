import { useExamDraftStore } from '@/features/lms/stores/use-exam-draft-store'
import { useReportDraftStore } from '@/features/lms/stores/use-report-draft-store'
import { useClassStore } from '@/features/lms/stores/use-class-store'
import { createJSONStorage } from 'zustand/middleware'

const discardStorage = createJSONStorage(() => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}))!

export function clearClassDrafts() {
  useExamDraftStore.getState().clearAllDrafts()
  useReportDraftStore.getState().clearAllDrafts()
  useClassStore.getState().closeClass()
}

export function prepareClassDraftSession(identity: string, storage: Storage) {
  const suffix = encodeURIComponent(identity)
  const examName = `geeo-exam-drafts:${suffix}`
  const reportName = `geeo-report-drafts:${suffix}`
  if (useExamDraftStore.persist.getOptions().name === examName &&
      useReportDraftStore.persist.getOptions().name === reportName) return

  useExamDraftStore.persist.setOptions({ storage: discardStorage })
  useReportDraftStore.persist.setOptions({ storage: discardStorage })
  clearClassDrafts()

  const scopedStorage = identity ? createJSONStorage(() => ({
    getItem: (name: string) => {
      try { return storage.getItem(name) } catch { return null }
    },
    setItem: (name: string, value: string) => {
      try { storage.setItem(name, value) } catch {}
    },
    removeItem: (name: string) => {
      try { storage.removeItem(name) } catch {}
    },
  }))! : discardStorage
  useExamDraftStore.persist.setOptions({ name: examName, storage: scopedStorage })
  useReportDraftStore.persist.setOptions({ name: reportName, storage: scopedStorage })
  void useExamDraftStore.persist.rehydrate()
  void useReportDraftStore.persist.rehydrate()
}
