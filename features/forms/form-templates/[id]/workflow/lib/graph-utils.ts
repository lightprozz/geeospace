// ---------------------------------------------------------------------------
// lib/graph-utils.ts — Client-side graph helpers (mirror of BE validator)
// ---------------------------------------------------------------------------
// Used for client-side preview: when the admin draws a deny-branch edge,
// we check locally before persisting. BE is authoritative for the final check.
//
// D2: the workflow chain itself is linear (step i → step i+1) and never
// participates in cycle detection. Only deny-branch edges are inspected,
// because a deny branch legitimately points backwards ("send back").
// ---------------------------------------------------------------------------

import type { Node, Edge } from '@xyflow/react'
import type { ProcessStepDto } from '../types/workflow'

/** Build a step adjacency graph from React Flow nodes + edges.
 *  Only deny-branch edges are registered (D2): the linear forward chain is
 *  layout information, not a routing edge, and including it would reject
 *  every legitimate backward deny. */
export function buildGraph(
  nodes: Node[],
  edges: Edge[],
  pendingSourceId?: string,
  pendingTargetId?: string,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  for (const node of nodes) {
    graph.set(node.id, new Set())
  }

  for (const edge of edges) {
    if (edge.data?.kind === 'deny') {
      graph.get(edge.source)?.add(edge.target)
    }
  }

  if (pendingSourceId && pendingTargetId) {
    if (!graph.has(pendingSourceId)) {
      graph.set(pendingSourceId, new Set())
    }
    graph.get(pendingSourceId)?.add(pendingTargetId)
  }

  return graph
}

/** DFS-based cycle detector. Returns the IDs of nodes involved in cycles.
 *  Empty set = acyclic (valid). */
export function detectCycles(graph: Map<string, Set<string>>): Set<string> {
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const cycleNodes = new Set<string>()

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, graph, visited, inStack, cycleNodes)
    }
  }

  return cycleNodes
}

function dfs(
  node: string,
  graph: Map<string, Set<string>>,
  visited: Set<string>,
  inStack: Set<string>,
  cycleNodes: Set<string>,
): void {
  visited.add(node)
  inStack.add(node)

  const neighbors = graph.get(node) ?? new Set()
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      dfs(neighbor, graph, visited, inStack, cycleNodes)
    } else if (inStack.has(neighbor)) {
      cycleNodes.add(node)
      cycleNodes.add(neighbor)
    }
  }

  inStack.delete(node)
}

/** Check if adding a deny-branch from source → target would create a cycle.
 *  A self-loop is always a cycle (D2). */
export function wouldCreateCycle(
  nodes: Node[],
  edges: Edge[],
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return true
  const graph = buildGraph(nodes, edges, sourceId, targetId)
  return detectCycles(graph).size > 0
}

/** Check if the current graph has any cycles. */
export function hasCycles(nodes: Node[], edges: Edge[]): boolean {
  return detectCycles(buildGraph(nodes, edges)).size > 0
}

/** Build the sequential edges between consecutive ordered steps.
 *  These edges exist for the dagre layout only — they carry no routing
 *  semantics and are never part of cycle detection. */
export function buildSequenceEdges(orderedSteps: ProcessStepDto[]): Edge[] {
  const edges: Edge[] = []
  for (let i = 0; i < orderedSteps.length - 1; i++) {
    const from = orderedSteps[i]!
    const to = orderedSteps[i + 1]!
    edges.push({
      id: `seq-${from.id}`,
      source: from.id,
      target: to.id,
      type: 'default',
      deletable: false,
      data: { kind: 'sequence' },
    })
  }
  return edges
}
