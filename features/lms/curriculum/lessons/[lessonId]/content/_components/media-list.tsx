'use client'
// ---------------------------------------------------------------------------
// _components/media-list.tsx
// URL-based media list manager for lesson content
// Validates URLs with Zod before adding
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ExternalLink, Plus, X } from 'lucide-react'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const UrlSchema = z.string().url('Please enter a valid URL')

interface MediaListProps {
  value: string[]
  onChange: (urls: string[]) => void
  disabled?: boolean
}

export function MediaList({ value, onChange, disabled = false }: MediaListProps) {
  const [newUrl, setNewUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  function handleAdd() {
    const result = UrlSchema.safeParse(newUrl.trim())
    if (!result.success) {
      setUrlError(result.error.issues[0]?.message ?? 'Invalid URL')
      return
    }
    if (value.includes(newUrl.trim())) {
      setUrlError('URL already in list')
      return
    }
    onChange([...value, newUrl.trim()])
    setNewUrl('')
    setUrlError('')
  }

  function handleRemove(url: string) {
    onChange(value.filter((u) => u !== url))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {/* URL list */}
      {value.length > 0 && (
        <ul className="space-y-1 rounded-md border bg-muted/30 p-2">
          {value.map((url) => (
            <li key={url} className="flex items-center gap-2 group">
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-blue-500 hover:underline truncate"
              >
                {url}
              </a>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(url)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add new URL */}
      {!disabled && (
        <div className="space-y-1">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value)
                if (urlError) setUrlError('')
              }}
              onKeyDown={handleKeyDown}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              onClick={handleAdd}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>
      )}

      {value.length === 0 && disabled && (
        <p className="text-xs text-muted-foreground italic">No media links</p>
      )}
    </div>
  )
}
