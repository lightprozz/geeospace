// ---------------------------------------------------------------------------
// lib/condition-expression.ts
// Structured condition rows ⇄ CEL-style expression string.
//
// A trigger stores one condition string (`conditionExpression`). The builder
// UI edits it as a list of rows — inputKey / operator / value — joined by AND
// or OR. These helpers convert between the two representations so the stored
// string stays the single source of truth on the wire.
//
// Grammar understood by the parser (a deliberate subset of CEL):
//   expr    := term (('&&' | '||') term)*
//   term    := '(' expr ')' | comparison
//   compare := identifier op literal
//   op      := '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'startsWith'
//              | 'endsWith' | 'exists'
//   literal := '"' text '"' | number | true | false | null
//
// Anything the parser cannot read is surfaced as a single "unparsed" row so the
// user sees the raw expression instead of losing it on save.
// ---------------------------------------------------------------------------

export type ConditionOperator =
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'exists'

export type ConditionLogic = 'AND' | 'OR'

export interface ConditionRow {
  /** Stable client id — never sent to the API. */
  id: string
  /** The template field's `inputKey`. */
  inputKey: string
  operator: ConditionOperator
  /** Compared literal, as typed by the user. Empty for `exists`. */
  value: string
  /** Parsed token, reused while its displayed value is unchanged. */
  originalLiteral?: string
  /** How this row joins with the row above it. The first row ignores it. */
  logic: ConditionLogic
}

export const CONDITION_OPERATORS: {
  value: ConditionOperator
  label: string
  /** Operators that need no right-hand value. */
  valueless?: boolean
}[] = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '>=', label: 'greater or equal' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'exists', label: 'exists', valueless: true },
]

const OPERATOR_BY_LABEL: Record<string, ConditionOperator> = {
  '==': '==',
  '=': '==',
  '!=': '!=',
  '<>': '!=',
  '>': '>',
  '>=': '>=',
  '<': '<',
  '<=': '<=',
  contains: 'contains',
  containsany: 'contains',
  startswith: 'startsWith',
  endswith: 'endsWith',
  exists: 'exists',
}

// --- row ids ---------------------------------------------------------------

let rowCounter = 0

/** Deterministic-enough client id for a new condition row. */
export function createConditionRowId(): string {
  rowCounter += 1
  return `cond-${rowCounter}`
}

// --- literal helpers -------------------------------------------------------

/** Quotes a literal when it is a plain string, leaves numbers bare. */
export function formatLiteral(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return '""'
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') {
    return trimmed
  }
  return `"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Strips the quotes from a parsed literal, unescaping the inner text. */
export function parseLiteral(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
  return trimmed
}

// --- serialisation ---------------------------------------------------------

/**
 * Renders the rows as a CEL-style expression.
 *
 * Rows without an `inputKey` are skipped — an incomplete row must not turn
 * into `"" == ""` on the wire.
 */
export function serializeConditions(rows: ConditionRow[]): string {
  const usable = rows.filter((r) => r.inputKey.trim().length > 0)
  if (usable.length === 0) return ''

  return usable
    .map((row, index) => {
      const op = row.operator
      const literal = row.originalLiteral !== undefined && parseLiteral(row.originalLiteral) === row.value
        ? row.originalLiteral
        : formatLiteral(row.value)
      const operand = op === 'exists' ? '' : ` ${literal}`
      const term = `${row.inputKey.trim()} ${op}${operand}`
      if (index === 0) return term
      return `${row.logic === 'OR' ? ' || ' : ' && '}${term}`
    })
    .join('')
}

// --- parsing ---------------------------------------------------------------

interface Segment {
  text: string
  /** The `&&` / `||` that joined this segment to the previous one. */
  logic: ConditionLogic
}

/**
 * Splits an expression on top-level `&&` / `||`.
 *
 * Separators inside quotes or parentheses do not split. A `||` wins over `&&`
 * at the same depth so the row list preserves the authored grouping.
 */
function splitTopLevel(expression: string): Segment[] {
  const segments: Segment[] = []
  let depth = 0
  let inString = false
  let start = 0
  let pendingLogic: ConditionLogic = 'AND'

  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i]

    if (inString) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === '"') inString = false
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '(') {
      depth += 1
      continue
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }

    if (depth === 0 && (ch === '&' || ch === '|')) {
      const isAnd = ch === '&' && expression[i + 1] === '&'
      const isOr = ch === '|' && expression[i + 1] === '|'
      if (isAnd || isOr) {
        segments.push({
          text: expression.slice(start, i).trim(),
          logic: pendingLogic,
        })
        pendingLogic = isOr ? 'OR' : 'AND'
        i += 1
        start = i + 1
      }
    }
  }

  const tail = expression.slice(start).trim()
  if (tail.length > 0) {
    segments.push({ text: tail, logic: pendingLogic })
  }

  return segments
}

/** Splits one comparison into its three parts. */
function parseComparison(term: string): {
  inputKey: string
  operator: ConditionOperator
  value: string
  originalLiteral: string
} | null {
  const trimmed = term.trim()
  if (trimmed === '') return null

  // The operator is the first operator token after the identifier.
  const match = /^([A-Za-z_][A-Za-z0-9_.]*)\s*(==|!=|>=|<=|>|<|contains|startsWith|endsWith|exists)\s*(.*)$/i.exec(
    trimmed,
  )
  if (!match) return null

  const operator = OPERATOR_BY_LABEL[match[2].toLowerCase()]
  if (!operator) return null

  const rawValue = match[3].trim()
  const value = operator === 'exists' ? '' : parseLiteral(rawValue)
  return { inputKey: match[1], operator, value, originalLiteral: rawValue }
}

/**
 * Reads a CEL-style expression into editable rows.
 *
 * Returns an empty list for an empty expression. An expression the parser
 * cannot read yields one row whose `inputKey` holds the raw text and whose
 * operator is `==` — the builder then falls back to the raw editor so the
 * author's text is never silently dropped.
 */
export function parseConditions(expression: string): ConditionRow[] {
  const trimmed = (expression ?? '').trim()
  if (trimmed === '') return []

  const segments = splitTopLevel(trimmed)
  const rows: ConditionRow[] = []
  let unparsed: string | null = null

  for (const segment of segments) {
    const parsed = parseComparison(segment.text)
    if (!parsed) {
      unparsed = unparsed === null ? segment.text : `${unparsed} ${segment.logic} ${segment.text}`
      continue
    }
    rows.push({
      id: createConditionRowId(),
      logic: segment.logic,
      ...parsed,
    })
  }

  if (rows.length === 0) {
    return [
      {
        id: createConditionRowId(),
        inputKey: trimmed,
        operator: '==',
        value: '',
        logic: 'AND',
      },
    ]
  }

  if (unparsed !== null) {
    rows.push({
      id: createConditionRowId(),
      inputKey: unparsed,
      operator: '==',
      value: '',
      logic: rows[rows.length - 1]?.logic ?? 'AND',
    })
  }

  return rows
}

/** True when the expression could not be fully understood by the parser. */
export function hasUnparsedCondition(rows: ConditionRow[]): boolean {
  return rows.some((row) => row.operator === '==' && row.value === '' && row.inputKey.trim() !== '')
}

/**
 * Validates the rows for saving.
 *
 * Returns the first problem found, or `null` when the rows are usable.
 */
export function validateConditions(rows: ConditionRow[]): string | null {
  for (const row of rows) {
    const key = row.inputKey.trim()
    if (key === '') return 'Chọn một trường cho mỗi điều kiện.'
    if (row.operator !== 'exists' && row.value.trim() === '') {
      return `Điều kiện trên "${key}" cần một giá trị.`
    }
  }
  return null
}
