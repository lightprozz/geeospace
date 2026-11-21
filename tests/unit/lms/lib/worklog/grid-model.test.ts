import { describe, expect, it } from "vitest"
import {
  buildGridModel,
  cellStatus,
  roundAwayFromZero,
  serializeGridCsv,
  type GridCell,
} from "@/features/lms/lib/worklog/grid-model"
import { dayColumns } from "@/features/lms/lib/worklog/payroll-cycle"
import { WorkLogStatusV2 } from "@/features/lms/types/worklog"
import type { WorkLogItemV2 } from "@/features/lms/types/worklog"

// ---------------------------------------------------------------------------
// Fixture helper — builds a full WorkLogItemV2 with sane defaults so each
// test only overrides what it cares about.
// ---------------------------------------------------------------------------

let idCounter = 0
function makeItem(overrides: Partial<WorkLogItemV2> = {}): WorkLogItemV2 {
  idCounter += 1
  return {
    id: `wl-${idCounter}`,
    teacherId: "teacher-1",
    subsForTeacherId: null,
    teacherLessonLogId: "tll-1",
    singleLessonId: null,
    effortType: "main_teacher",
    status: WorkLogStatusV2.Waitting,
    isExpat: false,
    evaluate: false,
    isEvent: false,
    eventTime: 0,
    score: 1.5,
    lessonStart: "2026-01-05T09:00:00",
    comment: null,
    order: 0,
    createdAt: "2026-01-05T09:00:00",
    updatedAt: "2026-01-05T09:00:00",
    classId: "class-1",
    className: "THM202",
    level: "M2 - Upper",
    teacherName: "Alice",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// roundAwayFromZero — BE parity (Math.Round(x, 1, MidpointRounding.AwayFromZero))
// ---------------------------------------------------------------------------

describe("roundAwayFromZero", () => {
  it("rounds a positive midpoint away from zero", () => {
    expect(roundAwayFromZero(1.25, 1)).toBe(1.3)
  })

  it("rounds a negative midpoint away from zero", () => {
    expect(roundAwayFromZero(-1.25, 1)).toBe(-1.3)
  })

  it("rounds non-midpoint values to the nearest tenth", () => {
    expect(roundAwayFromZero(1.44, 1)).toBe(1.4)
    expect(roundAwayFromZero(1.46, 1)).toBe(1.5)
  })

  it("rounds a small positive midpoint away from zero", () => {
    expect(roundAwayFromZero(0.05, 1)).toBe(0.1)
  })

  it("cleans up floating-point addition noise before rounding", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE754
    expect(roundAwayFromZero(0.1 + 0.2, 1)).toBe(0.3)
  })

  it("passes integers through unchanged", () => {
    expect(roundAwayFromZero(3, 1)).toBe(3)
    expect(roundAwayFromZero(0, 1)).toBe(0)
  })

  it("never returns negative zero", () => {
    expect(Object.is(roundAwayFromZero(-0, 1), -0)).toBe(false)
    expect(Object.is(roundAwayFromZero(1.5 - 1.5, 1), -0)).toBe(false)
  })

  it("rounds a small negative midpoint away from zero", () => {
    expect(roundAwayFromZero(-0.05, 1)).toBe(-0.1)
  })

  it("rounds a chain of small negative fragments to a midpoint away from zero", () => {
    // Mirrors the positive 3x0.05 golden case above, negated.
    expect(roundAwayFromZero(-0.05 - 0.05 - 0.05, 1)).toBe(-0.2)
  })

  it("no longer over-rounds a value that toPrecision(12) used to snap into a false midpoint", () => {
    // Raw double 0.3 + 0.35 === 0.6499999999999999 — genuinely BELOW the
    // 0.65 midpoint (verified: (0.3 + 0.35) * 10 === 6.499999999999999, no
    // multiplication double-rounding here). The removed toPrecision(12)
    // pre-snap collapsed this to the decimal string "6.50000000000" and
    // over-rounded away from zero to 0.7; the raw-double algorithm correctly
    // rounds down to 0.6, matching what BE's Math.Round would do on the same
    // double.
    expect(roundAwayFromZero(0.3 + 0.35, 1)).toBe(0.6)
  })

  it("mirrors the false-midpoint regression case for a negative sum", () => {
    expect(roundAwayFromZero(-0.3 - 0.35, 1)).toBe(-0.6)
  })

  it("documents the residual double-rounding gap for a 1.95 + 0.1 style chain", () => {
    // Raw double 1.95 + 0.1 === 2.0499999999999998, genuinely below the 2.05
    // midpoint — but `* 10` double-rounds the scaled value back up to
    // exactly 20.5 (IEEE754 multiplication artifact, not a toPrecision
    // artifact — see roundAwayFromZero's doc comment). This is the known
    // residual parity caveat tracked for phase-7, not a regression from this
    // change: the pre-fix toPrecision(12) implementation produced the same
    // 2.1 result for this exact input.
    expect(roundAwayFromZero(1.95 + 0.1, 1)).toBe(2.1)
  })
})

// ---------------------------------------------------------------------------
// buildGridModel — row derivation
// ---------------------------------------------------------------------------

describe("buildGridModel — row derivation", () => {
  it("groups items by (teacherId, classId, effortType) into one row", () => {
    const items = [
      makeItem({ lessonStart: "2026-01-05T09:00:00", score: 1.5 }),
      makeItem({ lessonStart: "2026-01-12T09:00:00", score: 1.5 }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows).toHaveLength(1)
    expect(model.rows[0].teacherId).toBe("teacher-1")
    expect(model.rows[0].classId).toBe("class-1")
    expect(model.rows[0].effortType).toBe("main_teacher")
    expect(Object.keys(model.rows[0].days)).toEqual(
      expect.arrayContaining(["2026-01-05", "2026-01-12"]),
    )
  })

  it("splits into separate rows when teacherId differs", () => {
    const items = [
      makeItem({ teacherId: "teacher-1" }),
      makeItem({ teacherId: "teacher-2", teacherName: "Bob" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows).toHaveLength(2)
  })

  it("splits into separate rows when classId differs", () => {
    const items = [
      makeItem({ classId: "class-1", className: "THM202" }),
      makeItem({ classId: "class-2", className: "LTTE01" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows).toHaveLength(2)
  })

  it("splits into separate rows when effortType differs", () => {
    const items = [
      makeItem({ effortType: "main_teacher" }),
      makeItem({ effortType: "co_teacher" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows).toHaveLength(2)
  })

  it("groups a null classId (e.g. off-shift, no anchor class) into one bucket", () => {
    const items = [
      makeItem({ classId: null, className: null, level: null, effortType: "off", score: 0 }),
      makeItem({
        classId: null,
        className: null,
        level: null,
        effortType: "off",
        score: 0,
        lessonStart: "2026-01-06T09:00:00",
      }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows).toHaveLength(1)
    expect(model.rows[0].classId).toBeNull()
  })

  it("falls back to teacherId when teacherName is missing", () => {
    const items = [makeItem({ teacherName: null })]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows[0].teacherName).toBe("teacher-1")
  })
})

// ---------------------------------------------------------------------------
// buildGridModel — multi-entry cell cardinality (no uniqueness constraint)
// ---------------------------------------------------------------------------

describe("buildGridModel — multi-entry cells", () => {
  it("sums multiple worklogs sharing (teacher, class, effortType, date) into one cell", () => {
    const items = [
      makeItem({ score: 1.5, lessonStart: "2026-01-05T09:00:00" }),
      makeItem({ score: 0.75, lessonStart: "2026-01-05T14:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    const cell = model.rows[0].days["2026-01-05"]
    expect(cell.score).toBe(2.25)
    expect(cell.entries).toHaveLength(2)
  })

  it("keeps cell.score exactly equal to the raw sum of its entries' scores", () => {
    const items = [
      makeItem({ score: 0.75, lessonStart: "2026-01-05T09:00:00" }),
      makeItem({ score: 0.75, lessonStart: "2026-01-05T14:00:00" }),
      makeItem({ score: 1.95, lessonStart: "2026-01-05T18:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    const cell = model.rows[0].days["2026-01-05"]
    const rawSum = items.reduce((sum, i) => sum + i.score, 0)
    expect(cell.score).toBe(rawSum)
  })

  it("keeps a single-entry cell's score untouched", () => {
    const items = [makeItem({ score: 1.5 })]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows[0].days["2026-01-05"].score).toBe(1.5)
  })
})

// ---------------------------------------------------------------------------
// buildGridModel — row / day / grand totals (BE rounding parity)
// ---------------------------------------------------------------------------

describe("buildGridModel — totals", () => {
  it("computes a row total as the BE-rounded sum of its cells", () => {
    const items = [
      makeItem({ score: 0.7, lessonStart: "2026-01-05T09:00:00" }),
      makeItem({ score: 0.7, lessonStart: "2026-01-06T09:00:00" }),
      makeItem({ score: 0.7, lessonStart: "2026-01-07T09:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    // raw sum 2.1 (well clear of any midpoint) — BE-rounded total must match it
    expect(model.rows[0].total).toBe(2.1)
  })

  it("computes day totals across ALL rows for a given date", () => {
    const items = [
      makeItem({ teacherId: "t1", teacherName: "Alice", score: 1.5, lessonStart: "2026-01-05T09:00:00" }),
      makeItem({ teacherId: "t2", teacherName: "Bob", score: 0.5, lessonStart: "2026-01-05T09:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.dayTotals["2026-01-05"]).toBe(2)
  })

  it("computes a grand total across every row and day", () => {
    const items = [
      makeItem({ teacherId: "t1", score: 1.5, lessonStart: "2026-01-05T09:00:00" }),
      makeItem({ teacherId: "t1", score: 1.5, lessonStart: "2026-01-06T09:00:00" }),
      makeItem({ teacherId: "t2", score: 0.5, lessonStart: "2026-01-05T09:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.grandTotal).toBe(3.5)
  })

  it("rounds totals to 1 decimal per BE MidpointRounding.AwayFromZero parity", () => {
    // Three 0.05 fragments sum to a midpoint-prone 0.15 -> BE rounds away from zero to 0.2
    const items = [
      makeItem({ score: 0.05, lessonStart: "2026-01-05T09:00:00" }),
      makeItem({ score: 0.05, lessonStart: "2026-01-05T10:00:00" }),
      makeItem({ score: 0.05, lessonStart: "2026-01-05T11:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.rows[0].total).toBe(0.2)
    expect(model.dayTotals["2026-01-05"]).toBe(0.2)
    expect(model.grandTotal).toBe(0.2)
  })

  it("returns zero totals for an empty item list", () => {
    const model = buildGridModel([], "2026-01")
    expect(model.rows).toHaveLength(0)
    expect(model.grandTotal).toBe(0)
    expect(model.dayTotals).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// buildGridModel — group-by-teacher subtotals
// ---------------------------------------------------------------------------

describe("buildGridModel — teacher subtotals", () => {
  it("sums across every class/effortType row belonging to the same teacher", () => {
    const items = [
      makeItem({
        teacherId: "t1",
        teacherName: "Alice",
        classId: "class-1",
        effortType: "main_teacher",
        score: 1.5,
        lessonStart: "2026-01-05T09:00:00",
      }),
      makeItem({
        teacherId: "t1",
        teacherName: "Alice",
        classId: "class-2",
        effortType: "co_teacher",
        score: 1.5,
        lessonStart: "2026-01-06T09:00:00",
      }),
      makeItem({
        teacherId: "t2",
        teacherName: "Bob",
        classId: "class-1",
        effortType: "main_teacher",
        score: 0.5,
        lessonStart: "2026-01-05T09:00:00",
      }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.teacherSubtotals).toHaveLength(2)

    const alice = model.teacherSubtotals.find((t) => t.teacherId === "t1")!
    expect(alice.total).toBe(3)
    expect(alice.days["2026-01-05"]).toBe(1.5)
    expect(alice.days["2026-01-06"]).toBe(1.5)

    const bob = model.teacherSubtotals.find((t) => t.teacherId === "t2")!
    expect(bob.total).toBe(0.5)
  })

  it("orders teacher subtotals alphabetically by teacherName", () => {
    const items = [
      makeItem({ teacherId: "t2", teacherName: "Zoe" }),
      makeItem({ teacherId: "t1", teacherName: "Alice", lessonStart: "2026-01-06T09:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    expect(model.teacherSubtotals.map((t) => t.teacherName)).toEqual(["Alice", "Zoe"])
  })
})

// ---------------------------------------------------------------------------
// buildGridModel — completeness guards (loud failure over silent corruption)
// ---------------------------------------------------------------------------

describe("buildGridModel — data integrity guards", () => {
  it("throws when an item has no lessonStart (cannot place it on the grid)", () => {
    const items = [makeItem({ lessonStart: null })]
    expect(() => buildGridModel(items, "2026-01")).toThrow()
  })

  it("throws when an item's lessonStart falls outside the requested period", () => {
    const items = [makeItem({ lessonStart: "2026-02-01T09:00:00" })]
    expect(() => buildGridModel(items, "2026-01")).toThrow()
  })
})

// ---------------------------------------------------------------------------
// cellStatus — ring color precedence: Rejected > Waitting > Accepted
// ---------------------------------------------------------------------------

describe("cellStatus", () => {
  it("returns Accepted when every entry is Accepted", () => {
    const cell: GridCell = {
      score: 3,
      entries: [
        makeItem({ status: WorkLogStatusV2.Accepted }),
        makeItem({ status: WorkLogStatusV2.Accepted }),
      ],
    }
    expect(cellStatus(cell)).toBe(WorkLogStatusV2.Accepted)
  })

  it("returns Waitting when any entry is still pending", () => {
    const cell: GridCell = {
      score: 3,
      entries: [
        makeItem({ status: WorkLogStatusV2.Accepted }),
        makeItem({ status: WorkLogStatusV2.Waitting }),
      ],
    }
    expect(cellStatus(cell)).toBe(WorkLogStatusV2.Waitting)
  })

  it("returns Rejected when any entry was rejected (highest attention priority)", () => {
    const cell: GridCell = {
      score: 3,
      entries: [
        makeItem({ status: WorkLogStatusV2.Accepted }),
        makeItem({ status: WorkLogStatusV2.Rejected }),
        makeItem({ status: WorkLogStatusV2.Waitting }),
      ],
    }
    expect(cellStatus(cell)).toBe(WorkLogStatusV2.Rejected)
  })
})

// ---------------------------------------------------------------------------
// serializeGridCsv — matches the visible view + RFC4180-style escaping
// ---------------------------------------------------------------------------

describe("serializeGridCsv", () => {
  it("emits a header row, one row per grid row, and a totals row", () => {
    const items = [makeItem({ score: 1.5, lessonStart: "2026-01-05T09:00:00" })]
    const model = buildGridModel(items, "2026-01")
    const columns = dayColumns("2026-01").filter((c) => c.dateKey === "2026-01-05")
    const csv = serializeGridCsv(model, columns)
    const lines = csv.split("\r\n")

    expect(lines[0]).toBe("Teacher,Class,Level,Effort Type,2026-01-05,Total")
    expect(lines[1]).toBe("Alice,THM202,M2 - Upper,main_teacher,1.5,1.5")
    expect(lines[2]).toBe("TOTAL,,,,1.5,1.5")
  })

  it("leaves an empty cell blank when a row has no entry for that day", () => {
    const items = [makeItem({ score: 1.5, lessonStart: "2026-01-05T09:00:00" })]
    const model = buildGridModel(items, "2026-01")
    const columns = dayColumns("2026-01").filter(
      (c) => c.dateKey === "2026-01-05" || c.dateKey === "2026-01-06",
    )
    const csv = serializeGridCsv(model, columns)
    const lines = csv.split("\r\n")
    expect(lines[1]).toBe("Alice,THM202,M2 - Upper,main_teacher,1.5,,1.5")
  })

  it("quotes and escapes fields containing commas or quotes", () => {
    const items = [
      makeItem({
        teacherName: 'Nguyễn "Ally", Le',
        className: "Class, A",
        score: 1.5,
        lessonStart: "2026-01-05T09:00:00",
      }),
    ]
    const model = buildGridModel(items, "2026-01")
    const columns = dayColumns("2026-01").filter((c) => c.dateKey === "2026-01-05")
    const csv = serializeGridCsv(model, columns)
    const lines = csv.split("\r\n")
    expect(lines[1]).toBe('"Nguyễn ""Ally"", Le","Class, A",M2 - Upper,main_teacher,1.5,1.5')
  })

  it("quotes and escapes a field containing a newline", () => {
    const items = [
      makeItem({
        teacherName: "Nguyễn\nAlly",
        className: "Class A",
        score: 1.5,
        lessonStart: "2026-01-05T09:00:00",
      }),
    ]
    const model = buildGridModel(items, "2026-01")
    const columns = dayColumns("2026-01").filter((c) => c.dateKey === "2026-01-05")
    const csv = serializeGridCsv(model, columns)
    // The escaped field's internal "\n" must NOT be mistaken for a row
    // separator — split on the RFC4180 "\r\n" line terminator, not bare "\n".
    const lines = csv.split("\r\n")
    expect(lines[1]).toBe('"Nguyễn\nAlly",Class A,M2 - Upper,main_teacher,1.5,1.5')
    expect(lines).toHaveLength(3) // header + 1 data row (with an embedded \n, not a "\r\n" separator) + TOTAL row
  })

  it("renders an explicit 0 for a cell whose entries sum to zero (distinct from no entry)", () => {
    const items = [
      makeItem({ score: 0, effortType: "off", lessonStart: "2026-01-05T09:00:00" }),
    ]
    const model = buildGridModel(items, "2026-01")
    const columns = dayColumns("2026-01").filter((c) => c.dateKey === "2026-01-05")
    const csv = serializeGridCsv(model, columns)
    const lines = csv.split("\r\n")
    expect(lines[1]).toBe("Alice,THM202,M2 - Upper,off,0,0")
  })
})
