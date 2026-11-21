import { expect, test } from '@playwright/test'
import { authBaseURL, mockGeeo, mockUser, seedGeeo } from './geeo-mocks'

test.use({ baseURL: authBaseURL })

const unit = { id: 'unit-1', classLessonId: 'lesson-1', unitId: 'u1', time: '5', procedures: 'Hello, explorers!', description: 'Discover a world of learning', materials: '', teacherActivities: 'Say hello to your class', learningOutcome: '', note: '', material: { id: 'm1', url: 'https://api.geeo.test/mock/lesson.svg', fileName: 'lesson.svg' } }
const illustration = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520"><rect width="960" height="520" rx="24" fill="#ecf5ff"/><circle cx="760" cy="115" r="62" fill="#ffd56b"/><path d="M0 420 Q240 260 480 420 T960 420 V520 H0" fill="#9dd9bc"/><text x="80" y="200" font-family="sans-serif" font-size="60" font-weight="bold" fill="#24465d">Hello, explorers!</text><text x="85" y="270" font-family="sans-serif" font-size="28" fill="#42677b">Let’s learn something wonderful today.</text><path d="M640 330 l70 -45 70 45 -70 45z M640 330v65l70 45v-65 M780 330v65l-70 45" fill="#7eb5e5" stroke="#42677b" stroke-width="4"/></svg>'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('geeospace.desktop.appearance.v1', JSON.stringify({ mode: 'light', wallpaper: 'geeo', glass: true, material: 'glass', motion: false, companionHidden: true })))
  await mockGeeo(page)
  await page.route('https://auth.geeo.test/connect/userinfo', route => route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { ...mockUser, permission: ['lesson.live.read'] } }))
  await seedGeeo(page.context())
  await page.route('https://api.geeo.test/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/mock/lesson.svg') return route.fulfill({ contentType: 'image/svg+xml', body: illustration })
    if (path.endsWith('/students')) return route.fulfill({ json: [{ id: 's1', studentName: 'Mai Nguyen', englishName: 'Mia' }, { id: 's2', studentName: 'An Tran', englishName: 'Andy' }] })
    return route.fulfill({ json: [unit, { ...unit, id: 'unit-2', unitId: 'u2', procedures: 'Practice together', material: null }] })
  })
})

test('launcher → lesson → roster and toolkit → end session', async ({ page, isMobile }) => {
  const externalAvatarRequests: string[] = []
  page.on('request', request => { if (request.url().includes('dicebear')) externalAvatarRequests.push(request.url()) })
  await page.goto('/')
  await page.addStyleTag({ content: 'nextjs-portal { display: none; }' })
  await expect(page.locator('.geeospace-os')).toHaveAttribute('data-ready', 'true')
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu Geeospace', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Tất cả ứng dụng', exact: true }).click()
  } else {
    await page.locator('.os-dock').getByRole('button', { name: 'Tất cả ứng dụng', exact: true }).click()
  }
  await page.getByRole('dialog', { name: 'Tất cả ứng dụng', exact: true }).getByRole('option', { name: /Cùng học/ }).click()
  const panel = page.locator('[data-app="lms-lets-learn"]')
  await expect(panel.getByRole('heading', { name: "Let's Learn" })).toBeVisible()
  if (!isMobile) await panel.getByRole('button', { name: /Phóng to/ }).click()
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ animations: 'disabled', path: `${process.env.SCREENSHOT_DIR}/lets-learn-entry.png` })
  await panel.getByLabel('Class lesson ID', { exact: true }).fill('lesson-1')
  await panel.getByLabel('Class ID (optional, for student roster)').fill('class-1')
  await panel.getByRole('button', { name: 'Start lesson' }).click()
  await expect(panel.getByAltText('Hello, explorers!')).toBeVisible()
  await expect(panel.getByAltText('Hello, explorers!')).toHaveJSProperty('naturalWidth', 960)
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ animations: 'disabled', path: `${process.env.SCREENSHOT_DIR}/lets-learn-running.png` })
  await panel.getByRole('button', { name: 'Open student roster' }).click()
  const roster = panel.getByRole('dialog', { name: 'Student roster' })
  await expect(roster.getByText('Mia', { exact: true })).toBeVisible()
  await roster.getByRole('button', { name: 'Toolkit', exact: true }).click()
  await expect(roster.getByText('Think - Pair - Share', { exact: true })).toBeVisible()
  await expect(roster.getByRole('button', { name: 'Toolkit', exact: true })).toHaveCSS('opacity', '1')
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ animations: 'disabled', path: `${process.env.SCREENSHOT_DIR}/lets-learn-toolkit.png` })
  await roster.getByRole('button', { name: 'Close roster' }).click()
  await panel.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(panel.getByRole('heading', { name: 'Practice together' })).toBeVisible()
  await panel.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(panel.getByRole('heading', { name: /Good bye/ })).toBeVisible()
  await panel.getByRole('button', { name: 'End Session' }).click()
  await expect(panel.getByRole('button', { name: 'Start lesson' })).toBeVisible()
  expect(externalAvatarRequests).toEqual([])
})

test('deep links show empty and error states without closing the workspace', async ({ page }) => {
  await page.route('https://api.geeo.test/api/v2/lesson-delivery/units/**', route => route.fulfill({ json: [] }))
  await page.goto('/#lets-learn/empty')
  await expect(page.getByText('No lesson content available')).toBeVisible()
  await page.getByRole('button', { name: 'Go Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Start lesson' })).toBeVisible()
  await page.route('https://api.geeo.test/api/v2/lesson-delivery/units/**', route => route.fulfill({ status: 400, contentType: 'application/problem+json', json: { title: 'Lesson not found' } }))
  await page.goto('/#lets-learn/missing')
  await expect(page.getByText('Lesson not found', { exact: true })).toBeVisible()
})

test('tool overlays fit a short maximized lesson window', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Exact desktop viewport regression')
  await page.setViewportSize({ width: 1280, height: 841 })
  await page.goto('/#lets-learn/lesson-1/class-1')
  await page.addStyleTag({ content: 'nextjs-portal { display: none; }' })
  const panel = page.locator('[data-app="lms-lets-learn"]')
  await panel.getByRole('button', { name: /Phóng to/ }).click()
  await panel.getByRole('button', { name: 'Open student roster' }).click()
  const roster = panel.getByRole('dialog', { name: 'Student roster' })
  await roster.getByRole('button', { name: 'Timer', exact: true }).click()
  const area = roster.locator('[data-tool-area]')
  for (const control of [roster.getByRole('heading', { name: 'Timer', exact: true }), roster.getByRole('button', { name: 'Start timer', exact: true }), roster.getByRole('button', { name: 'Reset timer', exact: true })]) {
    await expect(control).toBeInViewport({ ratio: 1 })
    await expect.poll(async () => {
      const bounds = await area.boundingBox()
      const rect = await control.boundingBox()
      return !!bounds && !!rect && rect.y >= bounds.y && rect.y + rect.height <= bounds.y + bounds.height
    }).toBe(true)
  }
  await roster.getByRole('button', { name: 'Start timer', exact: true }).click()
  await expect(roster.getByRole('button', { name: 'Pause timer', exact: true })).toBeVisible()
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ animations: 'disabled', path: `${process.env.SCREENSHOT_DIR}/lets-learn-timer-fixed.png` })
  await roster.getByRole('button', { name: 'Close tool', exact: true }).click()
  for (const tool of ['Groups', 'Noise Meter', 'Directions', 'Think - Pair - Share', 'Today', 'Music']) {
    await roster.getByRole('button', { name: 'Toolkit', exact: true }).click()
    await roster.getByRole('button', { name: tool, exact: true }).click()
    await expect(roster.getByRole('button', { name: 'Close tool', exact: true })).toBeInViewport({ ratio: 1 })
    const surface = area.locator(':scope > div').filter({ has: page.getByRole('button', { name: 'Close tool', exact: true }) })
    await expect.poll(async () => surface.evaluate(element => getComputedStyle(element).overflowY)).toMatch(/auto|scroll/)
    await roster.getByRole('button', { name: 'Close tool', exact: true }).click()
  }
})
