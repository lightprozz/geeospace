// ---------------------------------------------------------------------------
// components/form-renderer/field-density.ts
// Centralised density → tailwind class map. Every per-type field component
// imports from here so the height decision stays in exactly one file. When
// a designer wants to bump the compact height, this is the file to touch.
// ---------------------------------------------------------------------------

import type { FieldDensity } from "./field-props"

/**
 * Class for the visible input control. The shadcn <Input> baseline is h-7
 * (28px) which is below the WCAG 2.1 44px touch recommendation. The
 * "compact" density lifts it to h-9 (36px) — still short of 44px on paper,
 * but the form-renderer wraps every field in a `min-h-[44px]` shell on touch
 * devices (detected via `(hover: none)`) so the tap target survives the
 * design choice.
 */
export function fieldInputClass(
  density: FieldDensity = "comfortable",
  extra?: string,
): string {
  const base = density === "compact" ? "h-9" : "h-7"
  return [base, "w-full", extra].filter(Boolean).join(" ")
}

/**
 * Class for full-width multi-line controls (LongText, Attachment dropzone).
 * Compact pulls padding tighter and the textarea height down.
 */
export function fieldBlockClass(
  density: FieldDensity = "comfortable",
  extra?: string,
): string {
  const base = density === "compact"
    ? "min-h-20 px-2.5 py-1.5 text-sm"
    : "min-h-24 px-3 py-2 text-sm"
  return [base, "w-full", extra].filter(Boolean).join(" ")
}
