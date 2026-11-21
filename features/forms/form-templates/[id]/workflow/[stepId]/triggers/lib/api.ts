// Trigger API helpers — wraps the v2 form-builder /processes/{processId}/triggers endpoints

import { apiFetch } from '@/features/lms/lib/transport'
import type {
  TriggerDto,
  CreateTriggerRequest,
  TestFireRequest,
  TriggerTestFireResultDto,
  ApiConfigDto,
  CreateApiConfigRequest,
} from '../types/trigger'

const BASE = '/api/v2/form-builder/processes'

// ── Triggers ────────────────────────────────────────────────────────────────

export async function fetchTriggers(processId: string): Promise<TriggerDto[]> {
  return apiFetch<TriggerDto[]>(`${BASE}/${processId}/triggers`)
}

export async function createTrigger(
  processId: string,
  body: CreateTriggerRequest,
): Promise<TriggerDto> {
  return apiFetch<TriggerDto>(`${BASE}/${processId}/triggers`, {
    method: 'POST',
    body,
  })
}

export async function updateTrigger(
  processId: string,
  triggerId: string,
  body: CreateTriggerRequest,
): Promise<TriggerDto> {
  return apiFetch<TriggerDto>(`${BASE}/${processId}/triggers/${triggerId}`, {
    method: 'PUT',
    body,
  })
}

export async function deleteTrigger(
  processId: string,
  triggerId: string,
): Promise<void> {
  await apiFetch(`${BASE}/${processId}/triggers/${triggerId}`, {
    method: 'DELETE',
  })
}

export async function testFireTrigger(
  processId: string,
  triggerId: string,
  body: TestFireRequest,
): Promise<TriggerTestFireResultDto> {
  return apiFetch<TriggerTestFireResultDto>(
    `${BASE}/${processId}/triggers/${triggerId}/test-fire`,
    { method: 'POST', body },
  )
}

// ── API Config ─────────────────────────────────────────────────────────────

export async function fetchApiConfigs(processId: string): Promise<ApiConfigDto[]> {
  return apiFetch<ApiConfigDto[]>(`${BASE}/${processId}/api-config`)
}

export async function createApiConfig(
  processId: string,
  body: CreateApiConfigRequest,
): Promise<ApiConfigDto> {
  return apiFetch<ApiConfigDto>(`${BASE}/${processId}/api-config`, {
    method: 'POST',
    body,
  })
}

export async function updateApiConfig(
  processId: string,
  configId: string,
  body: CreateApiConfigRequest,
): Promise<ApiConfigDto> {
  return apiFetch<ApiConfigDto>(`${BASE}/${processId}/api-config/${configId}`, {
    method: 'PUT',
    body,
  })
}

export async function deleteApiConfig(
  processId: string,
  configId: string,
): Promise<void> {
  await apiFetch(`${BASE}/${processId}/api-config/${configId}`, {
    method: 'DELETE',
  })
}
