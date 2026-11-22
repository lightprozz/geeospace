'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TriggerTestFireResultDto } from '../types/trigger'
import { validateSandboxAnswers } from '../lib/test-fire-answers'

interface TriggerTestFireDialogProps {
  open: boolean
  onClose: () => void
  onFire: (sandboxJson: string) => Promise<void>
  result: TriggerTestFireResultDto | null
  isLoading: boolean
}

function StatusChip({ code }: { code: number | null }) {
  if (code === null) return null
  const color =
    code >= 200 && code < 300 ? 'bg-green-100 text-green-800'
    : code >= 400 && code < 500 ? 'bg-amber-100 text-amber-800'
    : code >= 500 ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-800'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {code}
    </span>
  )
}

export function TriggerTestFireDialog({
  open,
  onClose,
  onFire,
  result,
  isLoading,
}: TriggerTestFireDialogProps) {
  const [sandboxJson, setSandboxJson] = useState('[]')
  const [error, setError] = useState<string | null>(null)

  const handleFire = async () => {
    // The BE turns the answer list into a dictionary, so a repeated
    // inputKey would silently drop an answer. Validate before sending.
    const validation = validateSandboxAnswers(sandboxJson)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    setError(null)
    await onFire(JSON.stringify(validation.answers))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chạy thử trigger</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Nhập dữ liệu sandbox dưới dạng mảng JSON các đối tượng{' '}
              <code className="text-xs">{'{ inputKey, value }'}</code>.
            </p>
            <Textarea
              value={sandboxJson}
              onChange={(e) => {
                setSandboxJson(e.target.value)
                if (error) setError(null)
              }}
              placeholder='[{ "inputKey": "fullName", "value": "Test User" }]'
              rows={4}
              className="font-mono text-sm"
              aria-invalid={error ? 'true' : undefined}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button onClick={handleFire} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Gửi
          </Button>

          {result && (
            <div className="space-y-2 rounded-md border p-4">
              <div className="flex items-center gap-3">
                <StatusChip code={result.statusCode} />
                <span className="text-sm text-muted-foreground">
                  {result.elapsedMs}ms
                </span>
                {result.error && (
                  <span className="text-sm text-red-600">{result.error}</span>
                )}
              </div>
              {result.responseBody && (
                <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs">
                  {(() => {
                    try { return JSON.stringify(JSON.parse(result.responseBody!), null, 2) }
                    catch { return result.responseBody }
                  })()}
                </pre>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
