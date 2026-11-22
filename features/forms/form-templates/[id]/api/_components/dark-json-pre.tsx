'use client'
// ---------------------------------------------------------------------------
// _components/dark-json-pre.tsx
// Dark IDE-style code block with line numbers and minimal JSON syntax coloring.
// No external syntax-highlight lib — lightweight inline tokenizer keeps bundle small.
//
// Note: uses raw hex colors (#1e1e1e, #252526, etc.) for the code block
// context. This is an intentional exception to the oklch-only design rule since
// code blocks universally use dark IDE-style themes.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { Check, Copy, TerminalSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// JSON tokenizer — split JSON into tokens with inline color classes.
// Keeps the implementation lightweight (no PrismJS / highlight.js dependency).
// ---------------------------------------------------------------------------

type Token = { text: string; cls: string }

const TK = {
  KEY: 'text-[#9cdcfe]',      // cyan — object keys
  STRING: 'text-[#ce9178]',    // orange — string values
  NUMBER: 'text-[#b5cea8]',    // green — numbers
  BOOL: 'text-[#569cd6]',      // blue — true/false
  NULL: 'text-[#569cd6]',      // blue — null
  PUNCT: 'text-[#808080]',     // gray — punctuation
}

function tokenizeJson(raw: string): Token[][] {
  const lines = raw.split('\n')
  return lines.map((line) => {
    const tokens: Token[] = []
    let i = 0

    while (i < line.length) {
      // Whitespace — preserve as-is
      if (/\s/.test(line[i])) {
        let ws = ''
        while (i < line.length && /\s/.test(line[i])) { ws += line[i++]; }
        tokens.push({ text: ws, cls: '' })
        continue
      }

      // String (key or value)
      if (line[i] === '"') {
        let s = '"'
        i++
        while (i < line.length && line[i] !== '"') {
          if (line[i] === '\\' && i + 1 < line.length) { s += line[i++] + line[i++]; }
          else s += line[i++]
        }
        if (i < line.length) { s += line[i++]; } // closing "

        // Peek ahead: colon = key, else = string value
        const rest = line.slice(i).trimStart()
        const cls = rest.startsWith(':') ? TK.KEY : TK.STRING
        tokens.push({ text: s, cls })
        continue
      }

      // Number
      if (/[-\d]/.test(line[i])) {
        let n = ''
        while (i < line.length && /[-\d.eE+]/.test(line[i])) n += line[i++]
        tokens.push({ text: n, cls: TK.NUMBER })
        continue
      }

      // Literals
      if (line.slice(i, i + 4) === 'true') { tokens.push({ text: 'true', cls: TK.BOOL }); i += 4; continue }
      if (line.slice(i, i + 5) === 'false') { tokens.push({ text: 'false', cls: TK.BOOL }); i += 5; continue }
      if (line.slice(i, i + 4) === 'null') { tokens.push({ text: 'null', cls: TK.NULL }); i += 4; continue }

      // Punctuation
      tokens.push({ text: line[i], cls: TK.PUNCT })
      i++
    }

    return tokens
  })
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DarkJsonPreProps {
  code: string
  title?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DarkJsonPre({ code, title, className }: DarkJsonPreProps) {
  const [copied, setCopied] = useState(false)
  const lines = useMemo(() => tokenizeJson(code), [code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-[#1e1e1e] font-mono text-xs text-[#d4d4d4]',
        className,
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#333] bg-[#252526] px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[#cccccc]">
          <TerminalSquare className="h-3.5 w-3.5 text-[#9cdcfe]" aria-hidden="true" />
          {title ?? 'JSON'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          aria-label="Sao chép JSON"
          className="h-6 px-2 text-[10px] text-[#cccccc] hover:bg-[#3c3c3c] hover:text-[#d4d4d4]"
        >
          {copied ? (
            <>
              <Check className="mr-1 inline-block h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 inline-block h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code body */}
      <div className="custom-scrollbar flex max-h-80 overflow-auto">
        {/* Line numbers */}
        <div
          aria-hidden="true"
          className="shrink-0 select-none border-r border-[#333] bg-[#1e1e1e] px-2 py-2 text-right leading-[1.5] text-[#858585]"
        >
          {lines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>

        {/* Colored code */}
        <pre className="flex-1 overflow-x-auto p-2 leading-[1.5]">
          {lines.map((tokens, lineIdx) => (
            <div key={lineIdx}>
              {tokens.map((tok, tokIdx) => (
                <span key={tokIdx} className={tok.cls}>
                  {tok.text}
                </span>
              ))}
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
