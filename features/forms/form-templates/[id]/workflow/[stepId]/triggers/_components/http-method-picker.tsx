'use client'

import { Button } from '@/components/ui/button'
import type { HttpMethod } from '../types/trigger'
import { VALID_HTTP_METHODS } from '../types/trigger'

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-blue-600',
  POST: 'text-green-600',
  PUT: 'text-amber-600',
  PATCH: 'text-violet-600',
  DELETE: 'text-red-600',
}

interface HttpMethodPickerProps {
  value: HttpMethod | ''
  onChange: (value: HttpMethod) => void
}

export function HttpMethodPicker({ value, onChange }: HttpMethodPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {VALID_HTTP_METHODS.map((method) => (
        <Button
          key={method}
          type="button"
          variant={value === method ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(method)}
          className={value !== method ? METHOD_COLORS[method] : ''}
        >
          {method}
        </Button>
      ))}
    </div>
  )
}
