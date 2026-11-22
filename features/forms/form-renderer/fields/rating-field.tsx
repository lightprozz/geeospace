"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/rating-field.tsx
// Rating(14). `max` defaults to 5 (the mapper's default) and `precision` is
// the step. A fractional precision cannot be expressed with whole icons, so
// that (rare, authoring-time) case falls back to a stepped number input rather
// than silently rounding the stored value.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { CircleCheck, Flag, Heart, Smile, Star, ThumbsUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { decode } from "@/features/lms/lib/requests/field-value"
import type { Field } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

const DEFAULT_MAX = 5

// The icon ids are the authoring contract shared with the builder and the BE
// config binder, so they must match the old TPM set exactly.
const RATING_ICONS = {
  star: Star,
  heart: Heart,
  "thumb-up": ThumbsUp,
  "emoji-happy": Smile,
  "check-circle": CircleCheck,
  flag: Flag,
} as const

type RatingIconName = keyof typeof RATING_ICONS

function iconOf(field: Field) {
  const requested = field.config?.iconType
  const name = (
    requested && requested in RATING_ICONS ? requested : "star"
  ) as RatingIconName
  return RATING_ICONS[name]
}

function maxOf(field: Field): number {
  const max = field.config?.max
  return typeof max === "number" && max > 0 ? Math.floor(max) : DEFAULT_MAX
}

function stepOf(field: Field): number {
  const precision = field.config?.precision
  return typeof precision === "number" && precision > 0 ? precision : 1
}

function asNumber(field: Field, value: unknown): number | null {
  const decoded = decode(field, value)
  return typeof decoded === "number" ? decoded : null
}

export function RatingFieldInput(props: FieldInputProps) {
  const { field, value, onChange, onBlur, disabled, inputId } = props
  const { labelledBy, describedBy, invalid, density } = props
  const max = maxOf(field)
  const step = stepOf(field)
  const current = asNumber(field, value)
  const RatingIcon = iconOf(field)
  // Raw keystrokes are held LOCALLY and never enter form state: a Rating value
  // is identified by its SHAPE (the contested 12..15 range), so a string in
  // form state would re-resolve the field to PhoneNumber(12) — swapping the
  // control mid-typing and encoding the rating as text on the wire.
  const [typed, setTyped] = useState<string | null>(null)
  const isCompact = density === "compact"

  if (step < 1) {
    return (
      <Input
        id={inputId}
        name={field.inputKey}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={typed ?? (current === null ? "" : String(current))}
        onChange={(event) => {
          const text = event.target.value
          setTyped(text)
          const parsed = Number(text)
          onChange(
            text.trim() === "" || !Number.isFinite(parsed) ? null : parsed
          )
        }}
        onBlur={() => {
          setTyped(null)
          onBlur()
        }}
        disabled={disabled}
        aria-required={field.required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={isCompact ? "h-9 w-full" : "w-full"}
      />
    )
  }

  return (
    // `role="group"` supports neither aria-invalid nor aria-required — the
    // required marker sits in the label and the error node (role="alert") is
    // wired in through aria-describedby.
    <div
      id={inputId}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="flex items-center gap-1"
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => {
        const active = current !== null && score <= current
        return (
          <Button
            key={score}
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-pressed={active}
            aria-label={`${score} of ${max}`}
            onClick={() => onChange(current === score ? null : score)}
            onBlur={onBlur}
          >
            <RatingIcon
              className={cn(
                "h-4 w-4",
                active ? "fill-current text-amber-500" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
          </Button>
        )
      })}
      <span className="ml-2 text-sm text-muted-foreground">
        {current === null ? "Not rated" : `${current} / ${max}`}
      </span>
    </div>
  )
}

export function RatingFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  const current = asNumber(field, value ?? field.value)
  return (
    <ReadOnlyValue
      text={current === null ? "" : `${current} / ${maxOf(field)}`}
    />
  )
}
