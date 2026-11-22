// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureLmsTransport } from '@/features/lms/lib/transport'
import { useUpdateStudent, useUpdateParent, useCreateParentForStudent, useLinkParentToStudent, useAllParents } from '@/features/lms/hooks/students/use-students'
import { studentKeys } from '@/features/lms/lib/students/query-keys'

let client: QueryClient
let dispose: () => void
const request = vi.fn()
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(studentKeys.all, [])
  request.mockReset().mockResolvedValue({ id: 'parent-1' })
  dispose = configureLmsTransport({ request, resolveUrl: path => path })
})
afterEach(() => { cleanup(); client.clear(); dispose() })

function mount(action: string) {
  return renderHook(() => {
    const student = useUpdateStudent('student-1')
    const update = useUpdateParent('student-1')
    const create = useCreateParentForStudent('student-1')
    const link = useLinkParentToStudent('student-1')
    return () => {
      if (action === 'student') return student.mutateAsync({ studentName: 'Updated' })
      if (action === 'update parent') return update.mutateAsync({ parentId: 'parent-1', data: { name: 'Updated' } })
      if (action === 'create parent') return create.mutateAsync({ name: 'New', relation: 1 })
      return link.mutateAsync({ parentId: 'parent-1', data: { relation: 1 } })
    }
  }, { wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children) })
}

it.each(['student', 'update parent', 'create parent', 'link parent'])('invalidates the V2 Students list after %s succeeds', async action => {
  const { result } = mount(action)
  await act(async () => { await result.current() })
  expect(request).toHaveBeenCalledOnce()
  expect(client.getQueryState(studentKeys.all)?.isInvalidated).toBe(true)
})

it.each(['student', 'update parent', 'create parent', 'link parent'])('does not invalidate the Students list after %s fails', async action => {
  request.mockRejectedValue(new Error('offline'))
  const { result } = mount(action)
  await act(async () => { await expect(result.current()).rejects.toThrow('offline') })
  expect(client.getQueryState(studentKeys.all)?.isInvalidated).toBe(false)
})

it.each(['update parent', 'create parent'])('refreshes a fresh autocomplete cache after %s succeeds', async action => {
  client.setQueryData([...studentKeys.all, 'allParents'], [])
  const { result } = mount(action)
  await act(async () => { await result.current() })
  request.mockResolvedValue([{ id: 'parent-1', name: 'New parent' }])
  const parents = renderHook(() => useAllParents(), {
    wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children),
  })
  await waitFor(() => expect(parents.result.current.data?.[0]?.name).toBe('New parent'))
  expect(request).toHaveBeenCalledTimes(2)
})

it.each(['update parent', 'create parent'])('keeps the autocomplete cache fresh after %s fails', async action => {
  const key = [...studentKeys.all, 'allParents']
  client.setQueryData(key, [])
  request.mockRejectedValue(new Error('offline'))
  const { result } = mount(action)
  await act(async () => { await expect(result.current()).rejects.toThrow('offline') })
  expect(client.getQueryState(key)?.isInvalidated).toBe(false)
})
