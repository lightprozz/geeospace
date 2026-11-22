// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureLmsTransport } from '@/features/lms/lib/transport'
import { StudentsPanel } from '@/features/students/students-panel'
import { WindowNavigationContext } from '@/components/desktop/window-navigation'
import { usePermissionStore } from '@/stores/use-permission-store'
import { PERMISSIONS } from '@/lib/permissions'
import { useStudentStore } from '@/features/lms/stores/use-student-store'
import { student, studentResponse } from '../students-fixtures'

let dispose: () => void
let client: QueryClient
const request = vi.fn(async (path: string) => studentResponse(path))
const navigate = vi.fn()

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
  request.mockReset().mockImplementation(async path => studentResponse(path))
  navigate.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  dispose = configureLmsTransport({ request: async <T>(path: string) => await request(path) as T, resolveUrl: path => path })
  usePermissionStore.setState({ permissions: ['student.read', 'student.update', 'student.parent.manage'], isLoaded: true })
  useStudentStore.getState().resetFilters()
  useStudentStore.getState().setActiveTab('active')
})
afterEach(() => { cleanup(); client.clear(); dispose(); vi.unstubAllGlobals() })

function mount(path = '') {
  return render(h(QueryClientProvider, { client }, h(WindowNavigationContext.Provider, { value: { path, navigate, back: vi.fn(), canGoBack: !!path } }, h(StudentsPanel))))
}

it('renders active students, searches names and phones, filters inactive, and navigates inside the window', async () => {
  mount()
  await screen.findByText('Nguyen Minh Anh')
  expect(screen.queryByText('Le Mai')).toBeNull()
  const search = screen.getByPlaceholderText('Search by name or phone...')
  fireEvent.change(search, { target: { value: 'Annie' } })
  expect(screen.queryByText('Tran Bao Long')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View student info' }))
  expect(navigate).toHaveBeenCalledWith('student-1')
  fireEvent.change(search, { target: { value: '0901234567' } })
  expect(screen.getByText('Tran Bao Long')).toBeTruthy()
  fireEvent.change(search, { target: { value: 'not a student' } })
  expect(screen.getByText('No students found')).toBeTruthy()
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Inactive/ }), { button: 0, ctrlKey: false })
  await screen.findByText('Le Mai')
  expect(screen.getByText('Suspended', { selector: '[data-slot="badge"]' })).toBeTruthy()
  expect(screen.queryByText('Active', { selector: '[data-slot="badge"]' })).toBeNull()
  expect(screen.queryByText('Nguyen Minh Anh')).toBeNull()
})

it('shows an empty list and can recover from a list transport failure', async () => {
  request.mockRejectedValue(new Error('offline'))
  mount()
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Could not load students'))
  request.mockResolvedValue([])
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(screen.getByText('No students found')).toBeTruthy()
})

it.each([[1, 'Active'], [4, 'Suspended'], [5, 'Terminated']] as const)(
  'shows the date-derived badge for student type %s',
  async (currentStudentType, status) => {
    request.mockResolvedValue([{
      ...student,
      currentStudentType,
      suspendDate: currentStudentType === 4 ? '2025-02-01' : null,
      terminateDate: currentStudentType === 5 ? '2025-02-01' : null,
    }])
    useStudentStore.getState().setActiveTab(currentStudentType === 1 ? 'active' : 'inactive')
    mount()
    await screen.findByText(student.studentName)
    const badge = screen.getByText(status, { selector: '[data-slot="badge"]' })
    expect(badge).toBeTruthy()
    if (currentStudentType !== 1) {
      expect(screen.queryByText('Active', { selector: '[data-slot="badge"]' })).toBeNull()
    }
  },
)

it('renders profile, parents, payment and reports from the shared transport, and goes back to list', async () => {
  mount('student-1')
  await screen.findByText('annie.student')
  expect(screen.getByText('Nguyen Van Minh')).toBeTruthy()
  expect(screen.getByText('Explorers Term 1')).toBeTruthy()
  expect(screen.getByText('Payment Info')).toBeTruthy()
  expect(request).toHaveBeenCalledWith('/api/v2/student/students/student-1/learning-outcomes')
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(navigate).toHaveBeenCalledWith('')
})

it('renders a missing student separately from a transport error and retries', async () => {
  request.mockResolvedValue(null)
  mount('missing')
  expect(await screen.findByText('Student not found')).toBeTruthy()
  cleanup()
  request.mockRejectedValue(new Error('offline'))
  mount('broken')
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Could not load student'))
  request.mockImplementation(async path => studentResponse(path.replace('/broken', '/student-1')))
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('annie.student')
})

it.each(['', 'student-1'])('shows the shared no-access state without student.read at path "%s"', async path => {
  usePermissionStore.setState({ permissions: [PERMISSIONS.STUDENT_UPDATE] })
  mount(path)
  expect(screen.getByRole('status').textContent).toContain('Bạn chưa có quyền xem nội dung này.')
  expect(request).not.toHaveBeenCalled()
  expect(screen.queryByPlaceholderText('Search by name or phone...')).toBeNull()
  expect(screen.queryByText('annie.student')).toBeNull()
})

it('renders the list with only student.read permission', async () => {
  usePermissionStore.setState({ permissions: [PERMISSIONS.STUDENT_READ] })
  mount()
  expect(await screen.findByText('Nguyen Minh Anh')).toBeTruthy()
  expect(request).toHaveBeenCalledWith('/api/v2/student/students/all')
  expect(screen.getByPlaceholderText('Search by name or phone...')).toBeTruthy()
})
