export function shortenName(
  fullName: string | null | undefined,
  maxLength: number = 18
): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''

  if (trimmed.length <= maxLength) return trimmed

  const words = trimmed.split(/\s+/)
  if (words.length <= 2) return trimmed

  const firstWord = words[0]
  const middleInitials = words.slice(1, -1).map((w) => w.charAt(0).toUpperCase() + '.')
  const lastWord = words[words.length - 1]

  return [firstWord, ...middleInitials, lastWord].join(' ')
}
