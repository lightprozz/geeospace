export function shortenName(fullName: string | null | undefined, maxLength = 18): string {
  const trimmed = fullName?.trim() ?? ''
  if (trimmed.length <= maxLength) return trimmed
  const words = trimmed.split(/\s+/)
  if (words.length <= 2) return trimmed
  return [words[0], ...words.slice(1, -1).map(word => `${word.charAt(0).toUpperCase()}.`), words[words.length - 1]].join(' ')
}
