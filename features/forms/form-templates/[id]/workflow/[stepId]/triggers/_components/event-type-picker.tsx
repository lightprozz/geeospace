'use client'

import { Button } from '@/components/ui/button'
import type { ProcessAction } from '../types/trigger'
import { PROCESS_ACTION_LABELS, VALID_PROCESS_ACTIONS } from '../types/trigger'

interface EventTypePickerProps {
  value: ProcessAction | ''
  onChange: (value: ProcessAction) => void
}

export function EventTypePicker({ value, onChange }: EventTypePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {VALID_PROCESS_ACTIONS.map((action) => (
        <Button
          key={action}
          type="button"
          variant={value === action ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(action)}
        >
          {PROCESS_ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  )
}
