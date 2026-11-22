// ---------------------------------------------------------------------------
// _components/field-type-config.test.ts
// `buildDefaultConfig` is the single source of truth for a freshly-created
// field's config. Every surface that creates a field (the builder canvas, the
// compact worklog editor, the create-template flow) routes through it, so a
// drift between two of them shows up as a field that behaves differently
// depending on where it was authored.
//
// The assertions below pin the shapes the backend contract depends on:
//   Number → { min, max, allowNegative }  (no -Infinity, which cannot
//            round-trip through JSON)
//   Date   → { format }                   (feeds the InputMask column)
//   Rating → { max, precision, iconType } (feeds the params envelope)
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"

import { buildDefaultConfig } from "@/features/forms/form-templates/_components/field-type-config"

// The 16-type FieldType enum, mirrored from types/form-template.ts.
const ShortText = 0
const LongText = 1
const Date = 2
const Dropdown = 3
const CheckBox = 4
const MultipleCheckBox = 5
const DateTime = 6
const Time = 7
const Number = 8
const Phone = 9
const Email = 10
const UserName = 11
const Upload = 12
const Facilities = 13
const Rating = 14
const Link = 15

describe("buildDefaultConfig", () => {
  it("returns an empty config for types that carry no config", () => {
    for (const type of [
      ShortText,
      LongText,
      Dropdown,
      CheckBox,
      MultipleCheckBox,
      DateTime,
      Time,
      Phone,
      Email,
      UserName,
      Upload,
      Facilities,
      Link,
    ]) {
      expect(buildDefaultConfig(type)).toEqual({})
    }
  })

  it("gives a date field a format that can become an InputMask", () => {
    const config = buildDefaultConfig(Date) as { format: string }

    expect(config.format).toBe("dd/MM/yyyy")
  })

  it("gives a number field a finite min and an explicit allowNegative flag", () => {
    const config = buildDefaultConfig(Number) as {
      min: number | undefined
      max: number | undefined
      allowNegative: boolean
    }

    expect(config.allowNegative).toBe(false)
    expect(config.min).toBe(0)
    expect(config.max).toBeUndefined()

    // -Infinity is not representable in JSON, so it must never reach the wire.
    expect(config.min).not.toBe(Infinity)
    expect(config.min).not.toBe(-Infinity)
  })

  it("gives a rating field the icon and precision the renderer reads", () => {
    const config = buildDefaultConfig(Rating) as {
      max: number
      precision: number
      iconType: string
    }

    expect(config.max).toBe(5)
    expect(config.precision).toBe(1)
    expect(config.iconType).toBe("star")
  })

  it("is deterministic — the same type always yields the same config", () => {
    for (const type of [Date, Number, Rating, Dropdown]) {
      expect(buildDefaultConfig(type)).toEqual(buildDefaultConfig(type))
    }
  })
})
