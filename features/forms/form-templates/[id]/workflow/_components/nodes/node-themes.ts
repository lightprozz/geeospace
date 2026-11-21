// ---------------------------------------------------------------------------
// node-themes.ts — Shared color taxonomy for workflow step nodes.
//
// The approval types get their own theme so a reviewer can tell at a glance
// which kind of approver a step resolves to:
//   - approval     (teal,   #0f8b8d) → User, Role
//   - groupInHouse (amber,  #d97706) → Group (In-House)
//   - groupAll     (violet, #6b52d6) → Group (All)
//   - auto         (orange, #ff9900) → auto-approval type (future)
// Plus an emerald Start marker (#159e7a) for the synthetic trigger node.
//
// Raw colors are an accepted exception here: workflow diagrams commonly use
// hex palette for node-accent clarity, and the existing code already commits
// to this pattern. Future migration to oklch tokens would require a global
// "node-accent" token set added to `globals.css`.
// ---------------------------------------------------------------------------

export type NodeThemeKey =
  | 'approval'
  | 'groupInHouse'
  | 'groupAll'
  | 'auto'
  | 'trigger'

export interface NodeTheme {
  /** Primary accent color used on the left border and Handle dots. */
  accent: string
  /** Tailwind ring color class used when the node is `selected`. */
  ringClass: string
  /** Tailwind badge classes (bg + text + border) for the type pill. */
  badgeClasses: string
  /** Solid color used by the ReactFlow MiniMap. */
  miniMapColor: string
  /** Tailwind classes for Handle dots. */
  handleClass: string
  /** Tailwind text color used for in-card metadata. */
  textClass: string
}

export const NODE_THEMES: Record<NodeThemeKey, NodeTheme> = {
  approval: {
    accent: '#0f8b8d',
    ringClass: 'ring-teal-500',
    badgeClasses: 'bg-teal-50 text-teal-700 border-teal-200',
    miniMapColor: '#0f8b8d',
    handleClass: '!bg-teal-500',
    textClass: 'text-teal-700',
  },
  groupInHouse: {
    accent: '#d97706',
    ringClass: 'ring-amber-500',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    miniMapColor: '#d97706',
    handleClass: '!bg-amber-500',
    textClass: 'text-amber-700',
  },
  groupAll: {
    accent: '#6b52d6',
    ringClass: 'ring-violet-500',
    badgeClasses: 'bg-violet-50 text-violet-700 border-violet-200',
    miniMapColor: '#6b52d6',
    handleClass: '!bg-violet-500',
    textClass: 'text-violet-700',
  },
  auto: {
    accent: '#ff9900',
    ringClass: 'ring-orange-500',
    badgeClasses: 'bg-orange-50 text-orange-700 border-orange-200',
    miniMapColor: '#ff9900',
    handleClass: '!bg-orange-500',
    textClass: 'text-orange-700',
  },
  trigger: {
    accent: '#159e7a',
    ringClass: 'ring-emerald-500',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    miniMapColor: '#159e7a',
    handleClass: '!bg-emerald-500',
    textClass: 'text-emerald-700',
  },
} as const

/** Map a step.typeApprovalId to its theme key. Add new IDs here as BE grows. */
export function themeKeyForStepType(typeApprovalId: number): NodeThemeKey {
  switch (typeApprovalId) {
    case 1: // User
    case 2: // Role
      return 'approval'
    case 3: // Group In-House
      return 'groupInHouse'
    case 4: // Group All
      return 'groupAll'
    // Forward-compat: when BE introduces an auto-approval type, map it here.
    // case 5: return 'auto'
    default:
      return 'approval'
  }
}
