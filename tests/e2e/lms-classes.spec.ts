import { expect, test } from '@playwright/test'
import { authBaseURL, mockGeeo, mockUser, seedGeeo } from './geeo-mocks'
import { mockClassesApi } from './classes-mocks'
import { homedir } from 'node:os'
import { join } from 'node:path'

const screenshotPath = (name: string) => join(homedir(), 'screens', name)

test.use({ baseURL: authBaseURL })
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Classes desktop panel acceptance')
  await mockGeeo(page)
  await mockClassesApi(page)
})

test('sign in, browse Classes, switch detail tabs and preview an A4 exam', async ({ page }) => {
  await page.goto('/#account')
  const account = page.locator('[data-app="account"]')
  await account.getByLabel('Email', { exact: true }).fill(mockUser.email)
  await account.getByLabel('Mật khẩu', { exact: true }).fill('correct')
  await account.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.locator('.os-account-chip')).toContainText(mockUser.name)
  await page.goto('/#lms-classes')
  const panel = page.locator('[data-app="lms-classes"]')
  await panel.locator('.os-window-title').dblclick()
  await expect(panel.getByText('Starters A', { exact: true })).toBeVisible()
  await panel.screenshot({ path: screenshotPath('classes-list.png') })
  await panel.getByText('Starters A', { exact: true }).click()
  await expect(panel.getByRole('tab', { name: 'Lessons', exact: true })).toHaveAttribute('data-state', 'active')
  await expect(panel.getByRole('heading', { name: 'Schedule', exact: true })).toBeVisible()
  await expect(panel.getByText('Greetings', { exact: true })).toBeVisible()
  await panel.screenshot({ path: screenshotPath('classes-overview.png') })
  await panel.getByRole('tab', { name: 'Students', exact: true }).click()
  await expect(panel.getByText('Linh Nguyen', { exact: true })).toBeVisible()
  await panel.screenshot({ path: screenshotPath('classes-students.png') })
  await panel.getByRole('tab', { name: 'Class Reports', exact: true }).click()
  await expect(page).toHaveURL(/#lms-classes\/class-1\/reports$/)
  await expect(panel.getByText('No reports yet', { exact: true })).toBeVisible()
  await panel.getByRole('tab', { name: 'Exam Results', exact: true }).click()
  await panel.getByRole('combobox').filter({ hasText: 'Select student...' }).click()
  await page.getByRole('option', { name: 'Lily - Linh Nguyen' }).click()
  await panel.getByRole('combobox').filter({ hasText: 'Select exam...' }).click()
  await page.getByRole('option', { name: 'Midterm' }).click()
  await expect(panel.locator('#exam-printable-area')).toContainText('Linh Nguyen')
  await expect(panel.locator('#exam-printable-area')).toContainText('Midterm')
  await panel.screenshot({ path: screenshotPath('classes-exam-print.png') })
  await expect(panel.getByRole('button', { name: 'Print / PDF' })).toBeEnabled()
})

test('empty classes and API failure are distinct states', async ({ page }) => {
  await seedGeeo(page.context())
  await mockClassesApi(page, 'empty')
  await page.goto('/#lms-classes')
  const panel = page.locator('[data-app="lms-classes"]')
  await expect(panel.getByText('No classes found', { exact: true })).toBeVisible()
  await mockClassesApi(page, 'error')
  await page.reload()
  await expect(panel.getByRole('alert')).toContainText('Unable to load classes')
  await mockClassesApi(page)
  await panel.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(panel.getByText('Starters A', { exact: true })).toBeVisible()
})

test('cross-app links retain class and lesson preview identifiers', async ({ page }) => {
  await seedGeeo(page.context())
  await page.goto('/#lms-classes')
  const panel = page.locator('[data-app="lms-classes"]')
  await panel.locator('.os-window-title').dblclick()
  await panel.getByRole('button', { name: 'Timetable of Starters A', exact: true }).click()
  await expect(page).toHaveURL(/#lms-timetable\/class-1$/)
  await page.goto('/#lms-classes/class-1/lessons')
  await panel.getByRole('button', { name: 'Preview lesson', exact: true }).click()
  await expect(page).toHaveURL(/#lms-lets-learn\/class-lesson-1\/preview\/classLesson\/class-1$/)
})
