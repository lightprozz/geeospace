import { beforeEach, describe, expect, it } from 'vitest'
import { periodKeyFor, todayDateKeyInSaigon } from '@/features/lms/lib/worklog/payroll-cycle'
import { useWorklogStore } from '@/features/lms/stores/use-worklog-store'

// `todayDateKeyInSaigon` itself is unit-tested in lib/worklog/payroll-cycle.test.ts
// (its canonical home) — these tests only cover the store's own behavior of
// anchoring `periodKey` off of it.
describe('useWorklogStore', () => {
  beforeEach(() => {
    useWorklogStore.getState().reset()
  })

  it('defaults to the current payroll period, calendar tab, and no selected day', () => {
    const state = useWorklogStore.getState()
    expect(state.periodKey).toBe(periodKeyFor(todayDateKeyInSaigon()))
    expect(state.activeTab).toBe('calendar')
    expect(state.selectedDay).toBeNull()
  })

  it('selectDay sets the expanded day; closeDay clears it', () => {
    useWorklogStore.getState().selectDay('2026-01-10')
    expect(useWorklogStore.getState().selectedDay).toBe('2026-01-10')

    useWorklogStore.getState().closeDay()
    expect(useWorklogStore.getState().selectedDay).toBeNull()
  })

  it('setPeriodKey resets any expanded day (a day from another period is stale)', () => {
    useWorklogStore.getState().selectDay('2026-01-10')
    useWorklogStore.getState().setPeriodKey('2026-02')

    const state = useWorklogStore.getState()
    expect(state.periodKey).toBe('2026-02')
    expect(state.selectedDay).toBeNull()
  })

  it('setActiveTab switches tabs without touching period or selected day', () => {
    useWorklogStore.getState().setPeriodKey('2026-02')
    useWorklogStore.getState().selectDay('2026-01-10')
    useWorklogStore.getState().setActiveTab('ledger')

    const state = useWorklogStore.getState()
    expect(state.activeTab).toBe('ledger')
    expect(state.periodKey).toBe('2026-02')
    expect(state.selectedDay).toBe('2026-01-10')
  })

  it('reset restores default tab/selectedDay and re-anchors periodKey to "today"', () => {
    useWorklogStore.getState().setPeriodKey('2020-01')
    useWorklogStore.getState().setActiveTab('ledger')
    useWorklogStore.getState().selectDay('2020-01-10')

    useWorklogStore.getState().reset()

    const state = useWorklogStore.getState()
    expect(state.periodKey).toBe(periodKeyFor(todayDateKeyInSaigon()))
    expect(state.activeTab).toBe('calendar')
    expect(state.selectedDay).toBeNull()
  })
})
