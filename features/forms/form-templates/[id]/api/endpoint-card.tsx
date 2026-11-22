'use client'
// ---------------------------------------------------------------------------
// api/endpoint-card.tsx — Compact card showing HTTP method, URL, headers, params
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { HttpMethod, ParamDto, HeaderDto } from '@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/types/trigger'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const METHOD_VARIANT: Record<
  HttpMethod,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  GET: 'secondary',
  POST: 'default',
  PUT: 'outline',
  PATCH: 'secondary',
  DELETE: 'destructive',
}

interface EndpointCardProps {
  method: HttpMethod
  url: string
  title: string
  description?: string
  headers?: HeaderDto[]
  parameters?: ParamDto[]
  showCopy?: boolean
}

export function EndpointCard({
  method,
  url,
  title,
  description,
  headers,
  parameters,
  showCopy = false,
}: EndpointCardProps) {
  const hasExtra = (headers && headers.length > 0) || (parameters && parameters.length > 0)

  return (
    <div className="rounded-md border bg-card text-card-foreground">
      <div className="flex items-start gap-3 p-3">
        <Badge variant={METHOD_VARIANT[method]} className="shrink-0 mt-0.5">
          {method}
        </Badge>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{title}</span>
            {showCopy && <CopyButton text={url} label="Sao chép URL" />}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          <code className="block rounded bg-muted px-2 py-1 font-mono text-xs overflow-x-auto">
            {url}
          </code>
        </div>
      </div>

      {hasExtra && (
        <div className="border-t px-3 py-2 text-xs space-y-1">
          {parameters && parameters.length > 0 && (
            <div>
              <span className="font-medium">Parameters: </span>
              {parameters
                .map((p) => `${p.key}=${p.value || '…'}`)
                .join(' · ')}
            </div>
          )}
          {headers && headers.length > 0 && (
            <div>
              <span className="font-medium">Headers: </span>
              {headers.map((h) => `${h.key}: ${h.value || '…'}`).join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API (e.g., insecure context)
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      aria-label={label}
      className="h-7 px-2 text-xs"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy
        </>
      )}
    </Button>
  )
}
