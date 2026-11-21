import { expect, it } from 'vitest'
import { sortStudents } from '@/features/students/student-utils'
import { student } from '../students-fixtures'

it('sorts the full filtered collection before selecting a page', () => {
  const students = Array.from({ length: 25 }, (_, i) => ({ ...student, birthday: null, id: String(i), studentName: String(25 - i).padStart(2, '0') }))
  const sorted = sortStudents(students, { column: 'name', direction: 'asc' })
  expect(sorted.slice(0, 20)[0].studentName).toBe('01')
  expect(sorted.slice(20).map(s => s.studentName)).toEqual(['21', '22', '23', '24', '25'])
  expect(students[0].studentName).toBe('25')
  expect(sortStudents([], { column: null, direction: 'asc' })).toEqual([])
})

it('promotes a birthday from beyond the first page before pagination', () => {
  const today = new Date()
  const birthday = `2000-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const students = Array.from({ length: 25 }, (_, i) => ({ ...student, id: String(i), birthday: i === 24 ? birthday : null }))
  expect(sortStudents(students, { column: null, direction: 'asc' }).slice(0, 20)[0].id).toBe('24')
})
