// use-trigger-mutations.ts — TanStack Query mutations for trigger CRUD

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createTrigger,
  updateTrigger,
  deleteTrigger,
  createApiConfig,
  updateApiConfig,
  deleteApiConfig,
} from '../lib/api'
import type {
  CreateTriggerRequest,
  CreateApiConfigRequest,
} from '../types/trigger'
import { apiConfigQueryKey } from './use-api-configs'

function invalidate(processId: string, queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['form-templates', 'processes', processId, 'triggers'] })
}

function invalidateApiConfigs(processId: string, queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: apiConfigQueryKey(processId) })
}

export function useCreateTriggerMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTriggerRequest) => createTrigger(processId, body),
    onSuccess: () => invalidate(processId, queryClient),
  })
}

export function useUpdateTriggerMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ triggerId, body }: { triggerId: string; body: CreateTriggerRequest }) =>
      updateTrigger(processId, triggerId, body),
    onSuccess: () => invalidate(processId, queryClient),
  })
}

export function useDeleteTriggerMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (triggerId: string) => deleteTrigger(processId, triggerId),
    onSuccess: () => invalidate(processId, queryClient),
  })
}

export function useCreateApiConfigMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApiConfigRequest) => createApiConfig(processId, body),
    onSuccess: () => invalidateApiConfigs(processId, queryClient),
  })
}

export function useUpdateApiConfigMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      configId,
      body,
    }: {
      configId: string
      body: CreateApiConfigRequest
    }) => updateApiConfig(processId, configId, body),
    onSuccess: () => invalidateApiConfigs(processId, queryClient),
  })
}

export function useDeleteApiConfigMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (configId: string) => deleteApiConfig(processId, configId),
    onSuccess: () => invalidateApiConfigs(processId, queryClient),
  })
}
