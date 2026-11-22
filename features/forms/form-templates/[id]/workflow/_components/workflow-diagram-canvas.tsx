'use client'
// ---------------------------------------------------------------------------
// workflow-diagram-canvas.tsx
// Horizontal (left-to-right) approval flow. Start marker → step cards → end
// marker, laid out with dagre. The mockup's chrome is reproduced here:
// a dotted canvas, a zoom cluster pinned bottom-left, and no minimap.
// Node accents come from the shared NODE_THEMES palette.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  MarkerType,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import './workflow-flow.css'
import dagre from 'dagre'
import { AlertTriangle, Play } from 'lucide-react'
import { useProcessesQuery } from '../hooks/use-processes'
import { useDenyBranchMutation } from '../hooks/use-process-mutations'
import { ApprovalStepNode } from './nodes/approval-step-node'
import { StartNode } from './nodes/start-node'
import { EndNode } from './nodes/end-node'
import { DenyBranchEdge } from './edges/deny-branch-edge'
import { buildSequenceEdges, wouldCreateCycle } from '../lib/graph-utils'
import type { ProcessStepDto } from '../types/workflow'
import { cn } from '@/lib/utils'

const NODE_WIDTH = 320
const NODE_HEIGHT = 150
const START_END_WIDTH = 200
const START_END_HEIGHT = 84

/**
 * Width of the floating step navigator that overlays the left of the canvas.
 * The flow is laid out this far to the right so `fitView` never parks a node
 * underneath the navigator, where it could not be clicked.
 */
const STEP_LIST_WIDTH = 240

function getLayoutedElements(
  ns: Node[],
  es: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  // Horizontal flow: nodes are laid out in columns, left to right.
  g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 90 })

  ns.forEach((node) => {
    const isStartOrEnd = node.type === 'start-node' || node.type === 'end-node'
    g.setNode(node.id, {
      width: isStartOrEnd ? START_END_WIDTH : NODE_WIDTH,
      height: isStartOrEnd ? START_END_HEIGHT : NODE_HEIGHT,
    })
  })
  es.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = ns.map((node) => {
    const pos = g.node(node.id)
    const isStartOrEnd = node.type === 'start-node' || node.type === 'end-node'
    const w = isStartOrEnd ? START_END_WIDTH : NODE_WIDTH
    const h = isStartOrEnd ? START_END_HEIGHT : NODE_HEIGHT
    return {
      ...node,
      position: {
        // The flow starts after the floating step navigator, so a node is
        // never hidden behind it.
        x: pos.x - w / 2 + STEP_LIST_WIDTH,
        y: pos.y - h / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges: es }
}

const nodeTypes: NodeTypes = {
  'approval-step-node': ApprovalStepNode,
  'start-node': StartNode,
  'end-node': EndNode,
}

const edgeTypes: EdgeTypes = {
  'deny-branch-edge': DenyBranchEdge as unknown as EdgeTypes[string],
}

/**
 * Re-fits the viewport when the laid-out node set changes. The steps arrive
 * asynchronously, so the initial `fitView` on the ReactFlow element runs on an
 * empty canvas; this keeps the whole flow in view once the steps land.
 */
function FitViewOnChange({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (nodeCount === 0) return
    void fitView({ padding: 0.2 })
  }, [fitView, nodeCount])

  return null
}

interface WorkflowDiagramCanvasProps {
  templateId: string
  selectedStepId: string | null
  onStepSelect: (id: string | null) => void
  className?: string
}

export function WorkflowDiagramCanvas({
  templateId,
  onStepSelect,
  className,
}: WorkflowDiagramCanvasProps) {
  const { data: steps, isLoading, isError } = useProcessesQuery(templateId)
  // `useMutation` returns a fresh object literal on every render, so the
  // mutation handle must never be used as an effect or callback dependency:
  // it would re-run the layout effect forever. `mutate` itself is stable.
  const { mutate: mutateDenyBranch } = useDenyBranchMutation(templateId)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [cycleWarning, setCycleWarning] = useState<string | null>(null)

  // Sort once: processOrder drives the sequence, and both the layout and the
  // start/end connectors depend on it.
  const orderedSteps = useMemo(
    () =>
      [...(steps ?? [])].sort(
        (a: ProcessStepDto, b: ProcessStepDto) =>
          (a.processOrder ?? 0) - (b.processOrder ?? 0),
      ),
    [steps],
  )

  // W-H2/W-H3: removing a deny edge is a deny-branch write, not a canvas edit.
  // The edge's source step is the one whose deny-branch must be cleared.
  const handleDenyBranchDelete = useCallback(
    (edgeId: string) => {
      const sourceId = edgeId.startsWith('deny-') ? edgeId.slice('deny-'.length) : null
      if (!sourceId) return
      mutateDenyBranch({ processId: sourceId, request: {} })
    },
    [mutateDenyBranch],
  )

  useEffect(() => {
    if (!steps) return

    // Pure empty state: with no steps there is no flow to draw, so the canvas
    // shows neither the start/end markers nor any edge.
    if (orderedSteps.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const stepNodes: Node[] = orderedSteps.map((step) => ({
      id: step.id,
      type: 'approval-step-node',
      position: { x: 0, y: 0 },
      // M3: steps are removed through the step editor's delete flow, never by
      // pressing Delete on the canvas.
      deletable: false,
      data: {
        step,
        // Passed down so the card can resolve the label of a reject jump
        // without a second lookup inside the node.
        stepsById: Object.fromEntries(orderedSteps.map((s) => [s.id, s])),
      },
    }))

    const startNode: Node = {
      id: '__start__',
      type: 'start-node',
      position: { x: 0, y: 0 },
      data: { label: 'Gửi biểu mẫu' },
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
    }

    const endNode: Node = {
      id: '__end__',
      type: 'end-node',
      position: { x: 0, y: 0 },
      data: { label: 'Kết thúc' },
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
    }

    const denyEdges: Edge[] = orderedSteps.flatMap((s) => {
      if (!s.nextProcessIfDeniedId) return []
      return [
        {
          id: `deny-${s.id}`,
          source: s.id,
          target: s.nextProcessIfDeniedId,
          type: 'deny-branch-edge',
          // M3: the deny edge is removed through its own delete affordance, so
          // the canvas' keyboard delete must not remove it locally.
          deletable: false,
          data: { kind: 'deny', onDenyBranchDelete: handleDenyBranchDelete },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
        } as Edge,
      ]
    })

    // W-H4: the linear chain is drawn as real edges so the canvas shows how the
    // steps connect. These edges carry no routing semantics — only the
    // deny-branch edges do — and they are not deletable.
    const sequenceEdges = buildSequenceEdges(orderedSteps).map((edge) => ({
      ...edge,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#159e7a' },
    }))

    const connectorEdges: Edge[] = []
    connectorEdges.push({
      id: 'start-flow',
      source: '__start__',
      target: orderedSteps[0].id,
      type: 'default',
      deletable: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#159e7a' },
    })
    const last = orderedSteps[orderedSteps.length - 1]
    connectorEdges.push({
      id: 'end-flow',
      source: last.id,
      target: '__end__',
      type: 'default',
      deletable: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    })

    const allNodes = [startNode, ...stepNodes, endNode]
    const allEdges = [...connectorEdges, ...sequenceEdges, ...denyEdges]
    const { nodes: layouted } = getLayoutedElements(allNodes, allEdges)
    setNodes(layouted)
    setEdges(allEdges)
  }, [
    steps,
    orderedSteps,
    handleDenyBranchDelete,
    setNodes,
    setEdges,
  ])

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return

      if (wouldCreateCycle(nodes, edges, params.source, params.target)) {
        setCycleWarning('Không thể kết nối: kết nối này sẽ tạo vòng lặp.')
        setTimeout(() => setCycleWarning(null), 3000)
        return
      }

      // W-H2/W-H3: a deny branch is its own write. Using the full step PUT here
      // would overwrite the description and the approvers with whatever the
      // canvas happened to be holding.
      mutateDenyBranch({
        processId: params.source,
        request: { nextProcessIfDeniedId: params.target },
      })
    },
    [nodes, edges, mutateDenyBranch],
  )

  // Only step-to-step connections are meaningful; the start and end markers
  // are fixed points of the flow.
  const isValidConnection = useCallback(
    (conn: Connection | Edge) => {
      const source = conn.source
      const target = conn.target
      if (!source || !target) return false
      if (source === '__start__' || source === '__end__') return false
      if (target === '__start__' || target === '__end__') return false
      return source !== target
    },
    [],
  )

  if (isLoading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <span className="text-sm text-muted-foreground">Đang tải workflow…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center gap-2', className)}>
        <AlertTriangle className="size-5 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Không tải được các bước của workflow.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('forms-workflow relative h-full overflow-hidden', className)}>
      {cycleWarning ? (
        <div className="absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="size-3.5 shrink-0" />
          {cycleWarning}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={(_, node) => {
          if (node.type === 'start-node' || node.type === 'end-node') return
          onStepSelect(node.id)
        }}
        onPaneClick={() => onStepSelect(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        // M3: the canvas does not support keyboard deletion. Steps are removed
        // through the step editor's confirmed delete flow, and deny edges
        // through their own delete affordance.
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#d1d5db" />
        <Controls position="bottom-left" showInteractive={false} />
        <FitViewOnChange nodeCount={nodes.length} />
      </ReactFlow>

      {orderedSteps.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="mb-3 rounded-full bg-muted/50 p-4">
            <Play className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Chưa có bước nào.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thêm bước từ thanh bên trái để bắt đầu.
          </p>
        </div>
      ) : null}
    </div>
  )
}
