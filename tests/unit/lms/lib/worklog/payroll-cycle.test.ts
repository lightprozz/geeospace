import { afterEach, describe, expect, it, vi } from "vitest"
import {
  dateKeyToDate,
  dayColumns,
  periodKeyFor,
  periodRange,
  todayDateKeyInSaigon,
} from "@/features/lms/lib/worklog/payroll-cycle"

describe("todayDateKeyInSaigon", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("resolves a UTC instant that is still the same calendar day in ICT (UTC+7)", () => {
    vi.useFakeTimers()
    // 2026-01-01T10:00:00Z = 2026-01-01T17:00 ICT — same calendar day
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"))
    expect(todayDateKeyInSaigon()).toBe("2026-01-01")
  })

  it("resolves a UTC instant that has already rolled into the next ICT calendar day", () => {
    vi.useFakeTimers()
    // 2026-01-01T18:00:00Z = 2026-01-02T01:00 ICT — next calendar day
    vi.setSystemTime(new Date("2026-01-01T18:00:00Z"))
    expect(todayDateKeyInSaigon()).toBe("2026-01-02")
  })
})

describe("periodKeyFor", () => {
  it("keeps day <= 25 in the same calendar month's period", () => {
    expect(periodKeyFor("2026-01-25")).toBe("2026-01")
    expect(periodKeyFor("2026-01-01")).toBe("2026-01")
    expect(periodKeyFor("2026-12-25")).toBe("2026-12")
  })

  it("rolls day >= 26 into the FOLLOWING month's period", () => {
    expect(periodKeyFor("2026-01-26")).toBe("2026-02")
    expect(periodKeyFor("2026-01-31")).toBe("2026-02")
  })

  it("crosses a calendar year boundary backward (Dec -> Jan period)", () => {
    // 2025-12-31 belongs to the period that starts 2025-12-26, i.e. "2026-01"
    expect(periodKeyFor("2025-12-31")).toBe("2026-01")
    expect(periodKeyFor("2025-12-26")).toBe("2026-01")
    expect(periodKeyFor("2025-12-25")).toBe("2025-12")
  })

  it("crosses a calendar year boundary forward (day 26 of December)", () => {
    expect(periodKeyFor("2026-12-26")).toBe("2027-01")
  })
})

describe("periodRange", () => {
  it("resolves the Jan period across the year boundary", () => {
    expect(periodRange("2026-01")).toEqual({ from: "2025-12-26", to: "2026-01-25" })
  })

  it("resolves a period whose tail falls in a leap-year February", () => {
    expect(periodRange("2024-03")).toEqual({ from: "2024-02-26", to: "2024-03-25" })
  })

  it("resolves a period whose tail falls in a non-leap February", () => {
    expect(periodRange("2023-03")).toEqual({ from: "2023-02-26", to: "2023-03-25" })
  })

  it("resolves a period whose tail falls in a 30-day month", () => {
    expect(periodRange("2026-05")).toEqual({ from: "2026-04-26", to: "2026-05-25" })
  })

  it("resolves a period whose tail falls in a 31-day month", () => {
    expect(periodRange("2026-02")).toEqual({ from: "2026-01-26", to: "2026-02-25" })
  })

  it("throws on a malformed period key", () => {
    expect(() => periodRange("2026-1")).toThrow()
    expect(() => periodRange("not-a-period")).toThrow()
  })
})

describe("dayColumns", () => {
  it("counts 31 days for a period whose tail month has 31 days (Dec)", () => {
    expect(dayColumns("2026-01")).toHaveLength(31)
  })

  it("counts 29 days when the tail month is a leap-year February", () => {
    expect(dayColumns("2024-03")).toHaveLength(29)
  })

  it("counts 28 days when the tail month is a non-leap February", () => {
    expect(dayColumns("2023-03")).toHaveLength(28)
  })

  it("counts 30 days when the tail month has 30 days (April)", () => {
    expect(dayColumns("2026-05")).toHaveLength(30)
  })

  it("marks the leading tail days as isPrevMonth and the rest as current month", () => {
    const columns = dayColumns("2026-01")
    const first = columns[0]
    const last = columns[columns.length - 1]

    expect(first).toMatchObject({ dateKey: "2025-12-26", dayNum: 26, isPrevMonth: true })
    expect(last).toMatchObject({ dateKey: "2026-01-25", dayNum: 25, isPrevMonth: false })

    // First day of the current-month portion should flip isPrevMonth to false.
    const firstOfJan = columns.find((c) => c.dateKey === "2026-01-01")
    expect(firstOfJan?.isPrevMonth).toBe(false)
  })

  it("computes weekday using UTC calendar day-of-week (cross-checked against Date.UTC)", () => {
    const columns = dayColumns("2026-01")
    const first = columns[0]
    expect(first.weekday).toBe(new Date(Date.UTC(2025, 11, 26)).getUTCDay())
  })

  it("produces dateKeys in strictly ascending order with no gaps", () => {
    const columns = dayColumns("2026-05")
    for (let i = 1; i < columns.length; i++) {
      const prev = new Date(`${columns[i - 1].dateKey}T00:00:00.000Z`).getTime()
      const curr = new Date(`${columns[i].dateKey}T00:00:00.000Z`).getTime()
      expect(curr - prev).toBe(86_400_000)
    }
  })
})

describe("dateKeyToDate", () => {
  it("resolves a dateKey within the period to a UTC-midnight Date", () => {
    const date = dateKeyToDate("2026-01", "2026-01-10")
    expect(date.getTime()).toBe(Date.UTC(2026, 0, 10))
  })

  it("resolves the prior-month tail portion correctly", () => {
    const date = dateKeyToDate("2026-01", "2025-12-26")
    expect(date.getTime()).toBe(Date.UTC(2025, 11, 26))
  })

  it("throws when the dateKey belongs to the FOLLOWING period", () => {
    expect(() => dateKeyToDate("2026-01", "2026-01-26")).toThrow()
  })

  it("throws when the dateKey is before the period start", () => {
    expect(() => dateKeyToDate("2026-01", "2025-12-25")).toThrow()
  })

  it("throws on a malformed date key", () => {
    expect(() => dateKeyToDate("2026-01", "2026/01/10")).toThrow()
  })

  it("throws on a date key with a day that rolls over into the next month (2025-12-32)", () => {
    // Date.UTC(2025, 11, 32) silently normalizes to 2026-01-01 — must be
    // rejected rather than silently accepted as a different date.
    expect(() => dateKeyToDate("2026-01", "2025-12-32")).toThrow()
  })

  it("throws on a date key with a month that rolls over (2026-13-01)", () => {
    expect(() => dateKeyToDate("2026-01", "2026-13-01")).toThrow()
  })
})

describe("periodKeyFor rollover rejection", () => {
  it("throws on an out-of-range day instead of silently rolling into the next month", () => {
    expect(() => periodKeyFor("2026-02-30")).toThrow()
  })
})
