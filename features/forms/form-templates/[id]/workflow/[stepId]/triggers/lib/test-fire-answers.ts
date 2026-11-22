// ---------------------------------------------------------------------------
// lib/test-fire-answers.ts
// Validation for the test-fire sandbox payload.
//
// The BE builds a dictionary from the answer list, so a repeated `inputKey`
// silently loses an answer (the first one wins). The FE rejects duplicates up
// front so the author sees the problem instead of a surprising result.
// ---------------------------------------------------------------------------

export interface SandboxAnswer {
  inputKey: string
  value: string
}

export type SandboxValidation =
  | { ok: true; answers: SandboxAnswer[] }
  | { ok: false; error: string }

/**
 * Parses and validates the raw sandbox JSON.
 *
 * Accepts an array of `{ inputKey, value }` objects. A bare object is also
 * accepted and treated as a single-answer list, because that is what most
 * people reach for first.
 */
export function validateSandboxAnswers(raw: string): SandboxValidation {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') {
    return { ok: false, error: 'Nhập dữ liệu sandbox trước khi test-fire.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'JSON không hợp lệ. Cần một mảng { inputKey, value }.' }
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]

  const answers: SandboxAnswer[] = []
  const seen = new Set<string>()

  for (const [index, item] of items.entries()) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return {
        ok: false,
        error: `Phần tử thứ ${index + 1} phải là đối tượng { inputKey, value }.`,
      }
    }

    const record = item as Record<string, unknown>
    const inputKey = typeof record.inputKey === 'string' ? record.inputKey.trim() : ''
    if (inputKey === '') {
      return {
        ok: false,
        error: `Phần tử thứ ${index + 1} thiếu inputKey.`,
      }
    }

    if (seen.has(inputKey)) {
      return {
        ok: false,
        error: `inputKey "${inputKey}" bị lặp. Mỗi inputKey chỉ được xuất hiện một lần.`,
      }
    }
    seen.add(inputKey)

    const value = record.value
    answers.push({
      inputKey,
      value: value === null || value === undefined ? '' : String(value),
    })
  }

  return { ok: true, answers }
}
