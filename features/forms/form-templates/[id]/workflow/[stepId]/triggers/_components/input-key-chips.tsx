'use client'

import type { ParamDto } from '../types/trigger'

interface InputKeyChipsProps {
  inputKeys: ParamDto[]
  onInsert: (inputKey: string) => void
  disabled?: boolean
}

export function InputKeyChips({ inputKeys, onInsert, disabled }: InputKeyChipsProps) {
  if (inputKeys.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Available Input Keys — click to insert</p>
      <div className="flex flex-wrap gap-1">
        {inputKeys.map((key) => (
          <button
            key={key.key}
            type="button"
            onClick={() => !disabled && onInsert(key.key)}
            disabled={disabled}
            className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {`{{${key.key}}}`}
          </button>
        ))}
      </div>
    </div>
  )
}
