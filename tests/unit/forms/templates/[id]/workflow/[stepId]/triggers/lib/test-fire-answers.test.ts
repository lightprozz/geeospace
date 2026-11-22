import { describe, expect, it } from 'vitest'

import { validateSandboxAnswers } from "@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/lib/test-fire-answers"

describe('validateSandboxAnswers', () => {
  it('rejects an empty payload', () => {
    const result = validateSandboxAnswers('')
    expect(result.ok).toBe(false)
  })

  it('rejects malformed JSON', () => {
    const result = validateSandboxAnswers('{not json')
    expect(result.ok).toBe(false)
  })

  it('accepts an array of well-formed answers', () => {
    const result = validateSandboxAnswers(
      '[{"inputKey":"fullName","value":"Test User"}]',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.answers).toEqual([
        { inputKey: 'fullName', value: 'Test User' },
      ])
    }
  })

  it('accepts a single answer object', () => {
    const result = validateSandboxAnswers('{"inputKey":"a","value":"1"}')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers).toHaveLength(1)
  })

  it('rejects a duplicate inputKey', () => {
    const result = validateSandboxAnswers(
      '[{"inputKey":"a","value":"1"},{"inputKey":"a","value":"2"}]',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('a')
  })

  it('rejects an answer without an inputKey', () => {
    const result = validateSandboxAnswers('[{"value":"1"}]')
    expect(result.ok).toBe(false)
  })

  it('rejects a non-object item', () => {
    const result = validateSandboxAnswers('["nope"]')
    expect(result.ok).toBe(false)
  })

  it('coerces a non-string value to text', () => {
    const result = validateSandboxAnswers('[{"inputKey":"a","value":5}]')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers[0].value).toBe('5')
  })

  it('treats a missing value as an empty string', () => {
    const result = validateSandboxAnswers('[{"inputKey":"a"}]')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.answers[0].value).toBe('')
  })
})
