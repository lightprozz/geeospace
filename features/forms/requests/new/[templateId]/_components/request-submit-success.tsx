'use client'
// ---------------------------------------------------------------------------
// _components/request-submit-success.tsx
// Success screen after a request is submitted.
// ---------------------------------------------------------------------------

import { useRouter } from '@/features/forms/window-adapter'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface RequestSubmitSuccessProps {
  subject: string
}

export function RequestSubmitSuccess({ subject }: RequestSubmitSuccessProps) {
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">Request Submitted</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          <span className="font-medium text-foreground">&ldquo;{subject}&rdquo;</span> has been
          submitted successfully.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push('/requests?tab=created')}
        >
          View My Requests
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/requests/new')}
        >
          Submit Another
        </Button>
      </div>
    </div>
  )
}
