import { useWindowNavigation } from '@/components/desktop/window-navigation'

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
      else if (url.startsWith('/students/')) window.location.hash = `lms-students/${url.slice('/students/'.length)}`
      else if (url.startsWith('/timetable')) window.location.hash = `lms-timetable${url.slice('/timetable'.length)}`
    },
  }
}
