import { describe, expect, it } from 'vitest'

import {
  CONDITION_OPERATORS,
  createConditionRowId,
  formatLiteral,
  parseConditions,
  parseLiteral,
  serializeConditions,
  validateConditions,
  type ConditionRow,
} from "@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/lib/condition-expression"

function row(partial: Partial<ConditionRow>): ConditionRow {
  return {
    id: createConditionRowId(),
    inputKey: '',
    operator: '==',
    value: '',
    logic: 'AND',
    ...partial,
  }
}

describe('formatLiteral', () => {
  it('leaves a number bare', () => {
    expect(formatLiteral('1000')).toBe('1000')
    expect(formatLiteral('-12.5')).toBe('-12.5')
  })

  it('quotes a plain string', () => {
    expect(formatLiteral('yes')).toBe('"yes"')
  })

  it('leaves the CEL literals bare', () => {
    expect(formatLiteral('true')).toBe('true')
    expect(formatLiteral('false')).toBe('false')
    expect(formatLiteral('null')).toBe('null')
  })

  it('escapes quotes and backslashes', () => {
    expect(formatLiteral('say "hi"')).toBe('"say \\"hi\\""')
    expect(formatLiteral('a\\b')).toBe('"a\\\\b"')
  })

  it('renders an empty value as an empty string literal', () => {
    expect(formatLiteral('')).toBe('""')
    expect(formatLiteral('   ')).toBe('""')
  })
})

describe('parseLiteral', () => {
  it('strips the quotes', () => {
    expect(parseLiteral('"yes"')).toBe('yes')
  })

  it('unescapes the inner text', () => {
    expect(parseLiteral('"say \\"hi\\""')).toBe('say "hi"')
  })

  it('returns a bare number unchanged', () => {
    expect(parseLiteral('1000')).toBe('1000')
  })
})

describe('serializeConditions', () => {
  it('returns an empty string when there is no usable row', () => {
    expect(serializeConditions([])).toBe('')
    expect(serializeConditions([row({ inputKey: '  ' })])).toBe('')
  })

  it('renders a single comparison', () => {
    expect(serializeConditions([row({ inputKey: 'status', value: 'yes' })])).toBe(
      'status == "yes"',
    )
  })

  it('joins rows with AND by default', () => {
    const rows = [
      row({ inputKey: 'status', value: 'yes' }),
      row({ inputKey: 'amount', operator: '>', value: '1000' }),
    ]
    expect(serializeConditions(rows)).toBe('status == "yes" && amount > 1000')
  })

  it('honours an OR joiner', () => {
    const rows = [
      row({ inputKey: 'status', value: 'yes' }),
      row({ inputKey: 'status', value: 'no', logic: 'OR' }),
    ]
    expect(serializeConditions(rows)).toBe('status == "yes" || status == "no"')
  })

  it('omits the operand for the valueless exists operator', () => {
    expect(
      serializeConditions([row({ inputKey: 'note', operator: 'exists' })]),
    ).toBe('note exists')
  })

  it('skips rows without an inputKey', () => {
    const rows = [
      row({ inputKey: 'status', value: 'yes' }),
      row({ inputKey: '', value: 'orphan' }),
    ]
    expect(serializeConditions(rows)).toBe('status == "yes"')
  })
})

describe('parseConditions', () => {
  it('returns no rows for an empty expression', () => {
    expect(parseConditions('')).toEqual([])
    expect(parseConditions('   ')).toEqual([])
  })

  it('reads a single comparison', () => {
    const rows = parseConditions('status == "yes"')
    expect(rows).toHaveLength(1)
    expect(rows[0].inputKey).toBe('status')
    expect(rows[0].operator).toBe('==')
    expect(rows[0].value).toBe('yes')
  })

  it('reads a numeric operand', () => {
    const rows = parseConditions('amount > 1000')
    expect(rows[0].operator).toBe('>')
    expect(rows[0].value).toBe('1000')
  })

  it('splits an AND chain', () => {
    const rows = parseConditions('status == "yes" && amount > 1000')
    expect(rows).toHaveLength(2)
    expect(rows[0].inputKey).toBe('status')
    expect(rows[1].inputKey).toBe('amount')
    expect(rows[1].logic).toBe('AND')
  })

  it('splits an OR chain', () => {
    const rows = parseConditions('status == "yes" || status == "no"')
    expect(rows).toHaveLength(2)
    expect(rows[1].logic).toBe('OR')
  })

  it('does not split on a separator inside a quoted string', () => {
    const rows = parseConditions('note == "a && b"')
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe('a && b')
  })

  it('reads the word operators', () => {
    const rows = parseConditions('title contains "abc"')
    expect(rows[0].operator).toBe('contains')
    expect(rows[0].value).toBe('abc')
  })

  it('reads the valueless exists operator', () => {
    const rows = parseConditions('note exists')
    expect(rows[0].operator).toBe('exists')
    expect(rows[0].value).toBe('')
  })

  it('keeps the raw text when the expression cannot be parsed', () => {
    const rows = parseConditions('someFunction(x) > 1')
    expect(rows).toHaveLength(1)
    expect(rows[0].inputKey).toBe('someFunction(x) > 1')
  })

  it('round-trips through serialisation', () => {
    const expression = 'status == "yes" && amount > 1000'
    expect(serializeConditions(parseConditions(expression))).toBe(expression)
  })

  it('round-trips an OR chain through serialisation', () => {
    const expression = 'status == "yes" || status == "no"'
    expect(serializeConditions(parseConditions(expression))).toBe(expression)
  })
})

describe('validateConditions', () => {
  it('accepts complete rows', () => {
    expect(validateConditions([row({ inputKey: 'status', value: 'yes' })])).toBeNull()
  })

  it('accepts the valueless exists operator with no value', () => {
    expect(
      validateConditions([row({ inputKey: 'note', operator: 'exists' })]),
    ).toBeNull()
  })

  it('rejects a row without an inputKey', () => {
    expect(validateConditions([row({ value: 'yes' })])).not.toBeNull()
  })

  it('rejects a row without a value', () => {
    expect(validateConditions([row({ inputKey: 'status' })])).not.toBeNull()
  })
})

describe('CONDITION_OPERATORS', () => {
  it('marks only exists as valueless', () => {
    const valueless = CONDITION_OPERATORS.filter((op) => op.valueless)
    expect(valueless.map((op) => op.value)).toEqual(['exists'])
  })
})
