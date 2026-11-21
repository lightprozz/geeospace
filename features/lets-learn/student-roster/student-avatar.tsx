const colors = ['#1d4ed8', '#047857', '#7e22ce', '#be123c', '#a16207', '#0e7490']

export function avatarColor(id: string): string {
  let hash = 0
  for (const character of id) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0
  return colors[hash % colors.length]
}

export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length ? [...words[0]][0].toLocaleUpperCase() + (words.length > 1 ? [...words[words.length - 1]][0].toLocaleUpperCase() : '') : '?'
}

export function StudentAvatar({ id, name, className = '' }: { id: string; name: string; className?: string }) {
  return <span role="img" aria-label={name} className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${className}`} style={{ backgroundColor: avatarColor(id), color: '#fff' }}>
    <span className="text-[1.5em]">{avatarInitials(name)}</span>
  </span>
}
