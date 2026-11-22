import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { avatarColor, avatarInitials, StudentAvatar } from '@/features/lets-learn/student-roster/student-avatar'

it('renders initials locally with a deterministic ID-based color and no requests', () => {
  const markup = renderToStaticMarkup(createElement(StudentAvatar, { id: 'student-1', name: 'Mai Nguyen' }))
  expect(markup).toContain('MN')
  expect(markup).toContain('aria-label="Mai Nguyen"')
  expect(markup).not.toMatch(/<img|src=|https?:/)
  expect(avatarColor('student-1')).toBe(avatarColor('student-1'))
  expect(avatarColor('student-1')).not.toBe(avatarColor('student-2'))
  const renamed = renderToStaticMarkup(createElement(StudentAvatar, { id: 'student-1', name: 'Mia' }))
  expect(renamed).toContain(avatarColor('student-1'))
})

it.each([['', '?'], ['  ', '?'], ['Mia', 'M'], ['  Mai   Nguyen  ', 'MN'], ['Đặng Thị An', 'ĐA']])('uses safe initials for %j', (name, initials) => {
  expect(avatarInitials(name)).toBe(initials)
})
