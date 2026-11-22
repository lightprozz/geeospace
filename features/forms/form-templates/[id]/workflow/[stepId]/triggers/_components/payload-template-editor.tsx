'use client'

import { useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { InputKeyChips } from './input-key-chips'
import type { ParamDto } from '../types/trigger'
import { insertTemplateAtCursor } from '../lib/payload-template-helpers'

interface PayloadTemplateEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  inputKeys?: ParamDto[]
}

export function PayloadTemplateEditor({
  value,
  onChange,
  disabled,
  inputKeys = [],
}: PayloadTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChipInsert = (inputKey: string) => {
    if (!textareaRef.current) return
    const newValue = insertTemplateAtCursor(textareaRef.current, inputKey)
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'{\n  "user": "{{fullName}}",\n  "email": "{{email}}"\n}'}
        disabled={disabled}
        rows={8}
        className="font-mono text-sm"
      />
      <InputKeyChips inputKeys={inputKeys} onInsert={handleChipInsert} disabled={disabled} />
    </div>
  )
}
