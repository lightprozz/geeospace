// use-test-fire.ts — TanStack Query mutation for test-firing a trigger

import { useMutation } from '@tanstack/react-query'
import { testFireTrigger } from '../lib/api'
import type { TestFireRequest, TriggerTestFireResultDto } from '../types/trigger'

export function useTestFireMutation(processId: string) {
  return useMutation({
    mutationFn: ({ triggerId, body }: { triggerId: string; body: TestFireRequest }): Promise<TriggerTestFireResultDto> =>
      testFireTrigger(processId, triggerId, body),
  })
}
