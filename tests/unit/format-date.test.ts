import { expect, it } from "vitest";
import { compareIsoDate, formatDate, formatDateTime, formatTime, parseIso } from "@/lib/format-date";

it("formats local ISO dates and times consistently", () => {
  expect(formatDate("2026-05-20T10:30:00")).toBe("20/05/2026");
  expect(formatDateTime("2026-05-20T10:30:00")).toBe("20/05/2026 10:30");
  expect(formatTime("2026-05-20T10:30:00")).toBe("10:30");
  expect(formatTime("17:30")).toBe("17:30");
  expect(parseIso("2026-05-20")).toBeInstanceOf(Date);
});
it("handles empty and invalid date values", () => {
  for (const input of [null, undefined, "", "invalid", "2026-99-99"]) {
    expect(parseIso(input)).toBeNull();
    expect(formatDate(input)).toBe("—");
    expect(formatDateTime(input)).toBe("—");
    expect(formatTime(input)).toBe("—");
  }
});
it("compares ISO dates with invalid and missing dates last", () => {
  expect(compareIsoDate("2026-01-01", "2026-02-01")).toBeLessThan(0);
  expect(compareIsoDate("2026-01-01", "2026-01-01")).toBe(0);
  expect(compareIsoDate(null, "2026-01-01")).toBe(1);
  expect(compareIsoDate("2026-01-01", undefined)).toBe(-1);
  expect(compareIsoDate("invalid", null)).toBe(0);
});
