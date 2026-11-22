"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/read-only-value.tsx
// Shared presentation for a stored value with nothing to edit. Every ReadOnly
// half of the registry funnels through it so a blank value looks the same
// everywhere ("—", announced as "no value" rather than as punctuation).
// ---------------------------------------------------------------------------

import { cn } from "@/lib/utils"

interface ReadOnlyValueProps {
  /** Already-formatted display text. Blank renders the empty placeholder. */
  text?: string | null
  className?: string
  children?: React.ReactNode
}

export function ReadOnlyValue({
  text,
  className,
  children,
}: ReadOnlyValueProps) {
  if (children) {
    return (
      <div className={cn("text-sm whitespace-pre-wrap", className)}>
        {children}
      </div>
    )
  }

  const value = text?.trim()

  if (!value) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">No value</span>
      </p>
    )
  }

  return <p className={cn("text-sm whitespace-pre-wrap", className)}>{value}</p>
}
