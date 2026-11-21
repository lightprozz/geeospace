// replaced by shared LMS providers PR
import { usePermissionStore } from '@/stores/use-permission-store'

export const PERMISSIONS = {
  CLASS_CREATE: 'class.create',
  CLASS_UPDATE: 'class.update',
  CLASS_DELETE: 'class.delete',
  TEACHER_LESSONLOG_WRITE: 'teacher.lessonlog.write',
  TEACHER_ASSESSMENT_WRITE: 'teacher.assessment.write',
  WORKLOG_APPROVE: 'worklog.approve',
} as const

export function usePermission() {
  const { has, hasAny, hasAll, isLoaded } = usePermissionStore()
  return { can: has, canAny: hasAny, canAll: hasAll, isLoaded }
}
