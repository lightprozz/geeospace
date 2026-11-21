import type { StudentAllItem } from '@/features/lms/types/student'
import { sortWithBirthdayPriority, type SortConfig } from '@/hooks/use-sort'

export type StudentSortColumn = 'name' | 'englishName' | 'birthday' | 'startDate'

export function shortenName(
  fullName: string | null | undefined,
  maxLength: number = 18
): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''

  if (trimmed.length <= maxLength) return trimmed

  const words = trimmed.split(/\s+/)
  if (words.length <= 2) return trimmed

  const firstWord = words[0]
  const middleInitials = words.slice(1, -1).map((w) => w.charAt(0).toUpperCase() + '.')
  const lastWord = words[words.length - 1]

  return [firstWord, ...middleInitials, lastWord].join(' ')
}

function checkBirthdayString(birthday: string | null): boolean {
  if (!birthday) return false
  const today = new Date()
  const todayMonth = today.getMonth() // 0-indexed
  const todayDay = today.getDate()

  // Try dd/MM/yyyy format first (e.g. "15/08/2017")
  const ddMM = birthday.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddMM) {
    const day = parseInt(ddMM[1], 10)
    const month = parseInt(ddMM[2], 10) - 1 // convert to 0-indexed
    return month === todayMonth && day === todayDay
  }

  // Fallback: ISO / parseable date
  try {
    const d = new Date(birthday)
    if (isNaN(d.getTime())) return false
    return d.getMonth() === todayMonth && d.getDate() === todayDay
  } catch {
    return false
  }
}

/**
 * Also check birthdayFormat ("dd/MM/yyyy") which backend pre-formats.
 */
export function isStudentBirthdayToday(student: StudentAllItem): boolean {
  return checkBirthdayString(student.birthday)
}

export function sortStudents(students: StudentAllItem[], sortConfig: SortConfig<StudentSortColumn>, isInactiveTab = false): StudentAllItem[] {
  // Inactive tab: no sorting
  if (isInactiveTab) return students

  // Helper to check birthday today
  const checkBirthdayToday = (student: StudentAllItem) =>
    checkBirthdayString(student.birthday)

  // Build sortable wrapper with isBirthdayToday method
  const sortableStudents = students.map(s => ({
    ...s,
    isBirthdayToday: () => checkBirthdayToday(s)
  }))

  // Sort function based on column
  const sortFn = (a: StudentAllItem & { isBirthdayToday: () => boolean }, b: StudentAllItem & { isBirthdayToday: () => boolean }) => {
    let aVal = ''
    let bVal = ''

    switch (sortConfig.column) {
    case 'name':
      aVal = a.studentName || ''
      bVal = b.studentName || ''
      break
    case 'englishName':
      aVal = a.englishName || ''
      bVal = b.englishName || ''
      break
    case 'birthday':
      aVal = a.birthday || ''
      bVal = b.birthday || ''
      break
    case 'startDate':
      aVal = a.beginDate || ''
      bVal = b.beginDate || ''
      break
    default:
      return 0
    }

    const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
    return sortConfig.direction === 'asc' ? cmp : -cmp
  }

  return sortWithBirthdayPriority(sortableStudents, sortConfig.column, sortFn)

}
