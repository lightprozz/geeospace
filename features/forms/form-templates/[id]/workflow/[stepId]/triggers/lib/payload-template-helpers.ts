// Payload template helpers — cursor insertion + syntax highlight utilities

/**
 * Insert a {{inputKey.value}} placeholder at the cursor position in a textarea.
 */
export function insertTemplateAtCursor(
  textarea: HTMLTextAreaElement,
  inputKey: string,
) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = textarea.value.substring(0, start)
  const after = textarea.value.substring(end)
  const placeholder = `{{${inputKey}}}`
  const newValue = before + placeholder + after

  textarea.value = newValue

  // Place cursor after the inserted placeholder
  const newCursorPos = start + placeholder.length
  textarea.setSelectionRange(newCursorPos, newCursorPos)
  textarea.focus()

  return newValue
}

/**
 * Extract all {{key}} placeholders from a template string.
 */
export function extractTemplateKeys(template: string): string[] {
  const keys: string[] = []
  const regex = /\{\{([^}]+)\}\}/g
  let match
  while ((match = regex.exec(template)) !== null) {
    const inner = match[1]
    // Strip .value suffix
    const key = inner.endsWith('.value') ? inner.slice(0, -'.value'.length) : inner
    if (!keys.includes(key)) keys.push(key)
  }
  return keys
}

/**
 * Highlight {{placeholders}} in a template string for display (returns HTML string).
 * Escape HTML entities first.
 */
export function highlightTemplateHtml(template: string): string {
  if (!template) return ''
  const escaped = template
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/\{\{([^}]+)\}\}/g, '<mark class="text-blue-600 bg-blue-100 rounded px-0.5">{{$1}}</mark>')
}
