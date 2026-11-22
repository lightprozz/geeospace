import { expect, it } from 'vitest'
import { ParentEditFormSchema } from '@/features/lms/types/student'

it('coerces a provided parent birth year to a number', () => {
  expect(ParentEditFormSchema.parse({ name: 'Parent', relation: 1, yob: '1985' }).yob).toBe(1985)
})

it.each(['', '  ', null, undefined])('preserves an unknown parent birth year for %s', yob => {
  expect(ParentEditFormSchema.parse({ name: 'Parent', relation: 1, yob }).yob).toBeUndefined()
})

it('rejects an invalid parent birth year', () => {
  expect(ParentEditFormSchema.safeParse({ name: 'Parent', relation: 1, yob: 'unknown' }).success).toBe(false)
})
