// ---------------------------------------------------------------------------
// lib/graph-utils.test.ts
// The client-side mirror of the BE workflow graph validator (D2).
//
// D2: the workflow chain itself is linear (step i → step i+1) and never
// participates in cycle detection. Only deny-branch edges are inspected,
// because a deny branch legitimately points backwards ("send back"). A cycle
// formed exclusively by deny edges, or a self-loop, is invalid.
//
// These assertions pin the semantics that the canvas and the step drawer rely
// on before the BE has the final say.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import type { Node, Edge } from "@xyflow/react"

import {
  buildGraph,
  buildSequenceEdges,
  detectCycles,
  hasCycles,
  wouldCreateCycle,
} from "@/features/forms/form-templates/[id]/workflow/lib/graph-utils"
import type { ProcessStepDto } from "@/features/forms/form-templates/[id]/workflow/types/workflow"

function node(id: string, order: number): Node {
  const step = {
    id,
    processName: `Step ${id}`,
    processOrder: order,
  } as ProcessStepDto
  return {
    id,
    type: "approval-step-node",
    position: { x: 0, y: 0 },
    data: { step },
  }
}

function denyEdge(source: string, target: string): Edge {
  return {
    id: `deny-${source}`,
    source,
    target,
    type: "default",
    data: { kind: "deny" },
  }
}

function seqEdge(source: string, target: string): Edge {
  return {
    id: `seq-${source}`,
    source,
    target,
    type: "default",
    data: { kind: "sequence" },
  }
}

describe("buildGraph", () => {
  it("registers deny edges and ignores the forward chain", () => {
    const graph = buildGraph(
      [node("A", 0), node("B", 1)],
      [denyEdge("A", "B"), seqEdge("A", "B")],
    )

    expect(graph.get("A")).toEqual(new Set(["B"]))
  })

  it("adds the pending edge without mutating the persisted edges", () => {
    const graph = buildGraph(
      [node("A", 0), node("B", 1)],
      [],
      "A",
      "B",
    )

    expect(graph.get("A")).toEqual(new Set(["B"]))
  })
})

describe("wouldCreateCycle", () => {
  it("rejects a self-loop", () => {
    const nodes = [node("A", 0)]

    expect(wouldCreateCycle(nodes, [], "A", "A")).toBe(true)
  })

  it("accepts a backward deny branch (send back)", () => {
    const nodes = [node("A", 0), node("B", 1)]

    expect(wouldCreateCycle(nodes, [], "B", "A")).toBe(false)
  })

  it("accepts a forward deny branch", () => {
    const nodes = [node("A", 0), node("B", 1)]

    expect(wouldCreateCycle(nodes, [], "A", "B")).toBe(false)
  })

  it("rejects a deny chain that closes a cycle A → B → A", () => {
    const nodes = [node("A", 0), node("B", 1)]
    const edges = [denyEdge("A", "B")]

    // B → A would close the loop.
    expect(wouldCreateCycle(nodes, edges, "B", "A")).toBe(true)
  })

  it("accepts a deny branch that does not close a loop", () => {
    const nodes = [node("A", 0), node("B", 1), node("C", 2)]
    const edges = [denyEdge("A", "B")]

    // C → B is fine: nothing points back to C.
    expect(wouldCreateCycle(nodes, edges, "C", "B")).toBe(false)
  })

  it("never treats the linear forward chain as a cycle", () => {
    const nodes = [node("A", 0), node("B", 1), node("C", 2)]
    const edges = [seqEdge("A", "B"), seqEdge("B", "C")]

    expect(hasCycles(nodes, edges)).toBe(false)
  })
})

describe("detectCycles", () => {
  it("reports the nodes involved in a deny-only cycle", () => {
    const graph = buildGraph(
      [node("A", 0), node("B", 1)],
      [denyEdge("A", "B"), denyEdge("B", "A")],
    )

    expect(detectCycles(graph)).toEqual(new Set(["A", "B"]))
  })

  it("reports no cycle for a backward deny branch", () => {
    const graph = buildGraph(
      [node("A", 0), node("B", 1)],
      [denyEdge("B", "A")],
    )

    expect(detectCycles(graph).size).toBe(0)
  })
})

describe("buildSequenceEdges", () => {
  const steps = [
    { id: "A", processOrder: 0 } as ProcessStepDto,
    { id: "B", processOrder: 1 } as ProcessStepDto,
    { id: "C", processOrder: 2 } as ProcessStepDto,
  ]

  it("links consecutive steps for the layout", () => {
    const edges = buildSequenceEdges(steps)

    expect(edges.map((e) => [e.source, e.target])).toEqual([
      ["A", "B"],
      ["B", "C"],
    ])
  })

  it("marks the edges as layout-only and undeletable", () => {
    for (const edge of buildSequenceEdges(steps)) {
      expect(edge.data?.kind).toBe("sequence")
      expect(edge.deletable).toBe(false)
    }
  })

  it("produces no edge for a single step", () => {
    expect(buildSequenceEdges([steps[0]!])).toEqual([])
  })

  it("produces no edge for an empty list", () => {
    expect(buildSequenceEdges([])).toEqual([])
  })
})
