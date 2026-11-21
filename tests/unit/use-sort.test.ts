import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { parseDateForSort, sortWithBirthdayPriority, useSort } from "@/hooks/use-sort";

afterEach(() => vi.unstubAllGlobals());
it("normalizes dates for sorting and preserves invalid input", () => {
  expect(parseDateForSort("2/3/2026")).toBe("20260302");
  expect(parseDateForSort("2026-03-02T10:00:00Z")).toBe("20260302");
  expect(parseDateForSort(null)).toBe("");
  expect(parseDateForSort(undefined)).toBe("");
  expect(parseDateForSort("invalid")).toBe("invalid");
});
it("prioritizes birthdays then sorts within groups without mutating input", () => {
  const rows = [{ value: 2, isBirthdayToday: () => false }, { value: 3, isBirthdayToday: () => true }, { value: 1, isBirthdayToday: () => true }];
  expect(sortWithBirthdayPriority(rows, null, (a, b) => a.value - b.value).map(row => row.value)).toEqual([3, 1, 2]);
  expect(sortWithBirthdayPriority(rows, "value", (a, b) => a.value - b.value).map(row => row.value)).toEqual([1, 3, 2]);
  expect(rows.map(row => row.value)).toEqual([2, 3, 1]);
  expect(sortWithBirthdayPriority([], null, () => 0)).toEqual([]);
});
it("initializes sorting for SSR and recovers from invalid storage", () => {
  let config: unknown;
  function Probe() { config = useSort("sort", "name", ["name"]).sortConfig; return null; }
  renderToStaticMarkup(createElement(Probe));
  expect(config).toEqual({ column: "name", direction: "asc" });
  vi.stubGlobal("window", {});
  for (const value of ["not json", JSON.stringify({ column: "removed", direction: "desc" })]) {
    vi.stubGlobal("localStorage", { getItem: () => value });
    renderToStaticMarkup(createElement(Probe));
    expect(config).toEqual({ column: "name", direction: "asc" });
  }
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ column: "name", direction: "desc" }) });
  renderToStaticMarkup(createElement(Probe));
  expect(config).toEqual({ column: "name", direction: "desc" });
});
