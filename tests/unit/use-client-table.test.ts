import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useClientTable, type UseClientTableOptions, type UseClientTableResult } from "@/hooks/use-client-table";

type Row = { name: string; count: number | null; date?: string; enabled?: boolean };
const data: Row[] = [{ name: "Math", count: 12 }, { name: "Science", count: 3 }, { name: "Art", count: null }];
function evaluate(options: UseClientTableOptions<Row>) {
  let result: UseClientTableResult<Row>;
  function Probe() { result = useClientTable(options); return null; }
  renderToStaticMarkup(createElement(Probe));
  return result!;
}
afterEach(() => vi.unstubAllGlobals());

it("searches, filters, sorts and paginates without changing the source", () => {
  const result = evaluate({ data, searchFields: ["name"], searchQuery: "  a ", filters: [{ field: "name", operator: "neq", value: "ART" }], filterPredicate: row => row.count !== null, sort: { field: "count", desc: true }, page: 9, pageSize: 1 });
  expect(result).toMatchObject({ items: [data[0]], totalFiltered: 1, page: 1, totalPages: 1, rangeStart: 1, rangeEnd: 1, isFiltered: true, isEmpty: false });
  expect(data.map(row => row.name)).toEqual(["Math", "Science", "Art"]);
  expect(evaluate({ data, sort: { field: "count", desc: false } }).items.map(row => row.name)).toEqual(["Science", "Math", "Art"]);
});
it("handles empty datasets and unmatched searches", () => {
  for (const options of [{ data: [] }, { data, searchFields: ["name"] as (keyof Row)[], searchQuery: "missing" }]) {
    expect(evaluate(options)).toMatchObject({ items: [], totalFiltered: 0, totalPages: 1, page: 1, rangeStart: 0, rangeEnd: 0, isEmpty: true });
  }
});
it("supports structured filter operators and ISO sorting", () => {
  expect(evaluate({ data, filters: [{ field: "name", operator: "eq", value: "math" }] }).items).toEqual([data[0]]);
  expect(evaluate({ data, filters: [{ field: "name", operator: "contains", value: "CI" }] }).items).toEqual([data[1]]);
  const dates = [{ name: "Later", count: 1, date: "2026-06-01" }, { name: "Earlier", count: 2, date: "2026-01-01" }];
  expect(evaluate({ data: dates, defaultSort: { field: "date", desc: false } }).items[0].name).toBe("Earlier");
});
it("falls back from malformed persisted sort and honors controlled sort", () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { getItem: () => "not json" });
  expect(evaluate({ data, sortStorageKey: "table" }).items).toEqual(data);
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ field: "count", desc: false }) });
  expect(evaluate({ data, sortStorageKey: "table" }).items[0]).toBe(data[1]);
  expect(evaluate({ data, sortStorageKey: "table", sort: { field: "name", desc: false } }).items[0]).toBe(data[2]);
});
