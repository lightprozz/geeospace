'use client'
// ---------------------------------------------------------------------------
// _components/worklog-step-card.tsx
// Inline worklog form shown only when needToDo && canApprove.
// Fetches the step's WorkLog template, renders FormRenderer (edit mode),
// saves via useSaveWorklogStep, then refetches detail on success.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from "react"
import { Loader2, Save } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { FormRenderer, type RequestFormValues } from "@/features/forms/form-renderer/form-renderer"
import { buildAnswers, buildDefaultValues } from "@/features/forms/form-renderer/form-model"
import { useWorklogStep } from "@/features/lms/hooks/requests/use-worklog-step"
import { useSaveWorklogStep } from "@/features/lms/hooks/requests/use-request-mutations"
import { isConflictError, isNotEligibleError } from "@/features/lms/lib/requests/api"


interface WorklogStepCardProps {
  requestId: string
  processId: string | null
  currentWorkflowId: string | null
  updatedAt: string
  canApprove: boolean
  needToDo: boolean
  worklogFilled: boolean
  onSaved: () => void
  onError: (message: string) => void
  onFocusWorklog: () => void
}

export function WorklogStepCard({
  requestId,
  processId,
  updatedAt,
  canApprove,
  needToDo,
  onSaved,
  onError,
}: WorklogStepCardProps) {
  const form = useForm<RequestFormValues>()
  const { handleSubmit, control } = form
  const initRef = useRef(false)

  const templateQuery = useWorklogStep(requestId, processId)
  const saveMutation = useSaveWorklogStep()

  // Build default values when template loads
  const defaultValues = useMemo<RequestFormValues | undefined>(() => {
    if (!templateQuery.data) return undefined
    return buildDefaultValues(templateQuery.data.fields)
  }, [templateQuery.data])

  // Initialize form when defaults are ready
  useEffect(() => {
    if (defaultValues && !initRef.current) {
      initRef.current = true
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  const handleSave = handleSubmit(async (values) => {
    if (!templateQuery.data || !processId) return

    // The form is keyed by `fieldPath(field)` — reading `values[field.id]`
    // would post an empty answer for every field.
    const answers = buildAnswers(templateQuery.data.fields, values)

    try {
      await saveMutation.mutateAsync({
        id: requestId,
        input: { processId, answers },
        updatedAt,
      })
      onSaved()
    } catch (err) {
      if (isConflictError(err)) {
        onError("The request was modified by another user. Please refresh and try again.")
      } else if (isNotEligibleError(err)) {
        onError("You are no longer eligible to save this worklog.")
      } else {
        onError("Failed to save worklog. Please try again.")
      }
    }
  })

  // Server-enforced visibility gate — component is never rendered when these are false
  // but we keep the guard for belt-and-suspenders
  // Server enforces the gate: this component is only rendered when needToDo && canApprove.
  // Early return is a belt-and-suspenders guard.
  if (!needToDo || !canApprove || !processId) return null

  if (templateQuery.isLoading) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (templateQuery.isError || !templateQuery.data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">Failed to load worklog form.</span>
        </div>
      </div>
    )
  }

  const { name, description, fields } = templateQuery.data
  const isSaving = saveMutation.isPending

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Current Action Required
          </span>
          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Worklog form */}
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <FormRenderer
          mode="edit"
          fields={fields}
          density="compact"
          control={control}
          disabled={isSaving}
          attachmentUploadDisabled
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Save Worklog
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
