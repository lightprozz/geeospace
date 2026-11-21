import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { formatAppHash } from '@/lib/desktop/navigation'

export function classExternalHash(url: string): string | null {
  if (url.startsWith('/students/')) {
    return formatAppHash('lms-students', url.slice('/students/'.length))
  }
  const [pathname, query] = url.split('?')
  if (pathname === '/timetable') {
    return formatAppHash('lms-timetable', new URLSearchParams(query).get('classId') ?? '')
  }
  return null
}

export function classLessonPreviewHash(lessonId: string, classId: string): string {
  return formatAppHash('lms-lets-learn', `${lessonId}/preview/classLesson/${classId}`)
}

export function parseClassPath(path: string): { classId: string | null; tab: string } {
  const [classId, tab = 'lessons', ...extra] = path.split('/')
  if (!classId) return { classId: null, tab: 'lessons' }
  if (extra.length || !['lessons', 'students', 'reports', 'exams', 'events'].includes(tab)) {
    return { classId: null, tab: 'lessons' }
  }
  return { classId, tab }
}

export function useRouter() {
  const { navigate } = useWindowNavigation()
  return {
    push: (url: string) => {
      if (url === '/classes') navigate('')
      else if (url.startsWith('/classes/')) navigate(url.slice('/classes/'.length))
      else {
        const hash = classExternalHash(url)
        if (hash) window.location.assign(hash)
      }
    },
  }
}
