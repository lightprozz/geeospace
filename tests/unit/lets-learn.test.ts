import { beforeEach, expect, it } from 'vitest'
import { useLetsLearnStore } from '@/features/lms/stores/use-lets-learn-store'
import { resolveContentType, type LessonUnit } from '@/features/lms/types/lets-learn'
import { toRosterStudents } from '@/features/lets-learn/student-roster/student-grid'
import { parseAppHash } from '@/lib/desktop/navigation'
import { lessonUnitKey } from '@/features/lets-learn/unit-key'

const store = () => useLetsLearnStore.getState()
beforeEach(() => store().resetSession())

it('gives consecutive units distinct viewer identities even without IDs or resources', () => {
  const unit = { material: null } as LessonUnit
  expect(lessonUnitKey(unit, 0)).not.toBe(lessonUnitKey(unit, 1))
  expect(lessonUnitKey(unit, 0)).toBe(lessonUnitKey(unit, 0))
  const withMaterial = { ...unit, material: { id: 'm', url: 'https://example.test/first.pdf', fileName: null } }
  expect(lessonUnitKey(withMaterial, 0)).not.toBe(lessonUnitKey({ ...withMaterial, material: { ...withMaterial.material, url: 'https://example.test/second.pdf' } }, 0))
})

it('times each step, navigates completed steps and stops timing the end screen', () => {
  store().initSession(2)
  store().tick()
  store().goToStep(1)
  expect(store().activeStep).toBe(0)
  store().next()
  store().tick()
  store().tick()
  expect(store().durations).toEqual([1, 2])
  store().next()
  store().tick()
  expect(store().isEndScreen).toBe(true)
  expect(store().totalSeconds).toBe(3)
  store().back()
  expect(store().isEndScreen).toBe(false)
  store().goToStep(0)
  expect(store().activeStep).toBe(0)
  store().back()
  expect(store().activeStep).toBe(0)
})

it('resets session-only progress between lessons and handles an empty session', () => {
  store().initSession(2)
  store().tick()
  store().next()
  store().resetSession()
  expect(store()).toMatchObject({ activeStep: 0, durations: [], totalSeconds: 0, unitCount: 0, isEndScreen: false })
  store().initSession(0)
  expect(store().durations).toEqual([])
})

it.each([
  ['https://example.test/A.PDF?token=x#page=1', 'pdf'],
  ['https://example.test/a.mp4', 'video'],
  ['https://example.test/a.svg', 'image'],
  ['https://example.test/embed', 'url'],
  ['invalid', 'unknown'], [null, 'unknown'],
])('resolves %s to %s', (url, expected) => {
  expect(resolveContentType({ material: url ? { id: 'm', url, fileName: null } : null } as LessonUnit)).toBe(expected)
})

it('builds an empty roster without inventing students', () => {
  expect(toRosterStudents([])).toEqual([{ id: 's0', name: 'Whole Class', isClassEntry: true }])
})

it('accepts the short deep link, preserves roster and rejects unsafe paths', () => {
  expect(parseAppHash('#lets-learn/lesson-1/class-1')).toEqual({ id: 'lms-lets-learn', path: 'lesson-1/class-1' })
  expect(parseAppHash('#lets-learn/..')).toBeUndefined()
  expect(parseAppHash('#lets-learn/%ZZ')).toBeUndefined()
})
