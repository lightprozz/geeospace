import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { authBaseURL, mockGeeo, mockUser, seedGeeo } from './geeo-mocks'
import { studentResponse } from '../students-fixtures'

test.use({ baseURL: authBaseURL })

test.beforeEach(async ({ page }) => {
  await mockGeeo(page)
  await page.route('https://auth.geeo.test/connect/userinfo', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: { ...mockUser, permission: ['student.read', 'student.update', 'student.parent.manage'] },
  }))
  await page.route('https://api.geeo.test/api/v2/student/**', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    json: studentResponse(new URL(route.request().url()).pathname),
  }))
  await seedGeeo(page.context())
})

test('opens Students from launcher, searches and filters, opens detail and follows deep links', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.locator('.geeospace-os')).toHaveAttribute('data-ready', 'true')
  await page.getByRole('button', { name: 'Menu Geeospace' }).click()
  await page.getByRole('menuitem', { name: 'Tất cả ứng dụng', exact: true }).click()
  const launcher = page.getByRole('dialog', { name: 'Tất cả ứng dụng', exact: true })
  await launcher.getByRole('option').filter({ hasText: 'Học viên' }).click()
  const panel = page.locator('[data-app="lms-students"]')
  await expect(panel.getByText('Nguyen Minh Anh', { exact: true })).toBeVisible()
  if (info.project.name === 'desktop') {
    await panel.getByRole('button', { name: 'Phóng to hoặc khôi phục Học viên' }).click()
    await mkdir(`${homedir()}/screenshots`, { recursive: true })
    await page.screenshot({ path: `${homedir()}/screenshots/students-list.png` })
  }
  const search = panel.getByPlaceholder('Search by name or phone...')
  await search.fill('Annie')
  await expect(panel.getByText('Tran Bao Long', { exact: true })).toHaveCount(0)
  await search.fill('')
  await panel.getByRole('tab', { name: /Inactive/ }).click()
  await expect(panel.getByText('Le Mai', { exact: true })).toBeVisible()
  await panel.getByRole('tab', { name: /Active/, exact: false }).first().click()
  await search.fill('Annie')
  const row = panel.getByRole('row').filter({ hasText: 'Nguyen Minh Anh' })
  await row.hover()
  await row.getByRole('button', { name: 'View student info' }).click()
  await expect(page).toHaveURL(/#lms-students\/student-1$/)
  await expect(panel.getByText('annie.student', { exact: true })).toBeVisible()
  await expect(panel.getByText('Explorers Term 1', { exact: true })).toBeVisible()
  if (info.project.name === 'desktop') await page.screenshot({ path: `${homedir()}/screenshots/students-detail.png` })
  await page.reload()
  await expect(panel.getByText('annie.student', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(panel.getByText('Students Management')).toBeVisible()
})
