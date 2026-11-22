export function shortenName(fullName: string | null | undefined, maxLength = 18): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed || trimmed.length <= maxLength) return trimmed
  const words = trimmed.split(/\s+/)
  if (words.length <= 2) return trimmed
  const middleInitials = words.slice(1, -1).map(word => word.charAt(0).toUpperCase() + '.')
  return [words[0], ...middleInitials, words[words.length - 1]].join(' ')
}
