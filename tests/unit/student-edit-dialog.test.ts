// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureLmsTransport } from '@/features/lms/lib/transport'
import { StudentEditDialog } from '@/features/students/student-edit-dialog'
import { studentDetail } from '../students-fixtures'

let client: QueryClient
let dispose: () => void
const request = vi.fn()

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  request.mockReset().mockResolvedValue(studentDetail)
  dispose = configureLmsTransport({ request, resolveUrl: path => path })
})
afterEach(() => { cleanup(); client.clear(); dispose() })

function mount(date: string | null) {
  return render(h(QueryClientProvider, { client }, h(StudentEditDialog, {
    open: true,
    onOpenChange: vi.fn(),
    student: { ...studentDetail, birthday: date, beginDate: date },
  })))
}

it.each(['2010-05-12T00:00:00', '2010-05-12', '2010-05-12T00:00:00+07:00'])(
  'preserves the API calendar date in inputs and submitted dates for %s',
  async date => {
    mount(date)
    expect(screen.getByLabelText('Birthday')).toHaveProperty('value', '2010-05-12')
    expect(screen.getByLabelText('Begin Date')).toHaveProperty('value', '2010-05-12')
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))
    await waitFor(() => expect(request).toHaveBeenCalled())
    expect(request.mock.calls[0][1].body).toEqual(expect.objectContaining({
      birthday: '2010-05-12T00:00:00.000Z',
      beginDate: '2010-05-12T00:00:00.000Z',
    }))
  },
)

it.each([null, '', 'invalid'])('shows empty date inputs for %s', date => {
  mount(date)
  expect(screen.getByLabelText('Birthday')).toHaveProperty('value', '')
  expect(screen.getByLabelText('Begin Date')).toHaveProperty('value', '')
})
