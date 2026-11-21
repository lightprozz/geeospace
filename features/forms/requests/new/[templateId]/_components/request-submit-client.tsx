'use client'
// ---------------------------------------------------------------------------
// _components/request-submit-client.tsx
// Client shell for the Request Submit page.
// Fetches the template, renders hero + Subject + FormRenderer (edit mode),
// validates with react-hook-form, submits multipart payload, shows success.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '@/features/forms/window-adapter'
import { AlertCircle, FileText, Loader2, Send, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { PaperCanvas } from '@/features/forms/paper-canvas'
import { FormRenderer, type RequestFormValues } from '@/features/forms/form-renderer/form-renderer'
import { buildAnswers, buildDefaultValues, fieldPath, findDegradedPickerBlockers } from '@/features/forms/form-renderer/form-model'
import { useSubmitTemplate } from '@/features/lms/hooks/requests/use-available-templates'
import { useSubmitRequest } from '@/features/lms/hooks/requests/use-request-mutations'
import { isPickerNotEditableError, getPickerNotEditableFieldId, getErrorDetail } from '@/features/lms/lib/requests/api'
import type { Field } from '@/features/lms/types/request'

import { RequestSubmitSuccess } from './request-submit-success'

interface RequestSubmitClientProps {
  templateId: string
}

export function RequestSubmitClient({ templateId }: RequestSubmitClientProps) {
  const router = useRouter()
  const [submittedSubject, setSubmittedSubject] = useState<string | null>(null)

  // Fetch submit template
  const templateQuery = useSubmitTemplate(templateId)

  // Submit mutation
  const submitMutation = useSubmitRequest()

  // react-hook-form
  const form = useForm<RequestFormValues>({ values: undefined })
  const { register, handleSubmit, control, formState: { errors } } = form

  // Build default values once template loads
  const defaultValues = useMemo<RequestFormValues | undefined>(() => {
    if (!templateQuery.data) return undefined
    return buildDefaultValues(templateQuery.data.fields)
  }, [templateQuery.data])

  /**
   * Required degraded pickers (PickUser/PickStudent/Facilities/PickStudentWithClass)
   * with no stored value. They cannot be filled in on this screen, so they are
   * shown as a BANNER above the form rather than as a field error: the field
   * that carries the error is not rendered, so `setError` would write to an
   * unrendered path and the message would never be seen.
   */
  const degradedBlockers = useMemo(
    () => (templateQuery.data ? findDegradedPickerBlockers(templateQuery.data.fields) : []),
    [templateQuery.data],
  )

  // Initialize form when defaults are ready (avoids SSR/hydration mismatch)
  const initRef = useRef(false)
  useEffect(() => {
    if (defaultValues && !initRef.current) {
      initRef.current = true
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  // Dashboard header
  useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Submit Request</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => router.push('/requests')}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Cancel
      </Button>
    ),
  })

  // Attachment files, kept per FIELD. The backend routes a multipart part by
  // its NAME: a part named after a field's `inputKey` lands on that field, and
  // the generic `files` bucket targets the FIRST Attachment field. Naming the
  // parts by `inputKey` is therefore the only way two attachment fields can
  // be uploaded in one submit without crossing over.
  const [fieldFiles, setFieldFiles] = useState<Record<string, File[]>>({})

  const handleAttachmentChange = useCallback((fieldId: string, files: File[]) => {
    setFieldFiles((prev) => ({ ...prev, [fieldId]: files }))
  }, [])

  /**
   * Maps the picked files onto multipart part names. A field without an
   * `inputKey` falls back to the generic `files` bucket, which the server
   * routes to the first Attachment field.
   */
  const attachmentParts = useCallback(
    (fields: Field[], files: Record<string, File[]>) => {
      const parts: Record<string, File[]> = {}

      for (const [fieldId, group] of Object.entries(files)) {
        if (group.length === 0) continue

        const field = fields.find((f) => f.id === fieldId)
        const partName = field?.inputKey?.trim() || "files"

        parts[partName] = [...(parts[partName] ?? []), ...group]
      }

      return parts
    },
    [],
  )

  // Submit handler
  const onSubmit = handleSubmit(async (values) => {
    const template = templateQuery.data
    if (!template) return

    // A required degraded picker with no stored value cannot be satisfied on
    // this screen. The banner above the form already explains it, so the
    // submit is simply refused here rather than posting an answer the server
    // would reject with an opaque 422.
    if (degradedBlockers.length > 0) return

    // Build answers array — the form is keyed by `fieldPath(field)`, so the
    // values MUST be read through the same path mapping.
    const answers = buildAnswers(template.fields, values)

    const payload = {
      templateId,
      subject: values.__subject as string,
      answers,
    }

    try {
      await submitMutation.mutateAsync({
        payload,
        files: attachmentParts(template.fields, fieldFiles),
      })
      setSubmittedSubject(values.__subject as string)
    } catch (err) {
      if (isPickerNotEditableError(err)) {
        const fieldId = getPickerNotEditableFieldId(err)
        const field = fieldId
          ? template.fields.find((f: Field) => f.id === fieldId)
          : undefined
        if (field) {
          const path = fieldPath(field)
          form.setError(path, {
            type: 'manual',
            message: `${field.label || field.fieldName} cannot be edited here because no lookup is available for this role.`,
          })
          return
        }
      }

      // Everything else — a 422 from the server, a network failure, a 500 —
      // is surfaced as a toast carrying the server's own explanation. The
      // banner below the form stays for the CLIENT-side blockers only.
      toast.error(getErrorDetail(err, 'Your request could not be submitted. Please try again.'))
    }
  })

  // Loading state
  if (templateQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading template...</p>
      </div>
    )
  }

  // Error state
  if (templateQuery.isError || !templateQuery.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Template not found</p>
          <p className="text-xs text-muted-foreground">
            This template may not be available for your role or may have been removed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/requests/new')}>
          Back to Templates
        </Button>
      </div>
    )
  }

  // Success state
  if (submittedSubject) {
    return <RequestSubmitSuccess subject={submittedSubject} />
  }

  const { name, description, fields } = templateQuery.data
  const isPending = submitMutation.isPending

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
      {/* Hero */}
      <div className="flex shrink-0 flex-col gap-1 border-b px-6 py-4">
        <div className="flex items-center gap-2 text-muted-foreground" aria-hidden="true">
          <FileText className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Request Form</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">{name}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Form body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-8">
          <PaperCanvas
            title={name}
            subtitle={description ?? undefined}
          >
            <div className="flex flex-col gap-6 p-6">
              {/* Degraded-picker blockers — a required read-only picker with
                  no stored value. Shown as a banner because the offending
                  field is not rendered on this screen. */}
              {degradedBlockers.length > 0 && (
                <div
                  role="alert"
                  className="flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-3"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    This request cannot be submitted here
                  </p>
                  <ul className="ml-6 list-disc text-xs text-muted-foreground">
                    {degradedBlockers.map((blocker) => (
                      <li key={blocker.field.id}>{blocker.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subject field — owned by shell, not the renderer */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="__subject" className="text-sm font-medium">
                  Request Subject{' '}
                  <span aria-hidden="true" className="text-destructive">*</span>
                  <span className="sr-only">(required)</span>
                </Label>
                <Input
                  id="__subject"
                  placeholder="Brief title for your request"
                  {...register('__subject', {
                    required: 'Please enter a subject for your request.',
                    // A subject of spaces is not a subject: `required` alone
                    // accepts "   ", and the request would go out with a blank
                    // title that nobody can find in the inbox.
                    validate: (value) =>
                      String(value ?? '').trim() !== '' ||
                      'Please enter a subject for your request.',
                  })}
                  aria-invalid={!!errors.__subject}
                  aria-describedby={errors.__subject ? '__subject-error' : undefined}
                  disabled={isPending}
                />
                {errors.__subject && (
                  <p id="__subject-error" role="alert" className="text-xs text-destructive">
                    {errors.__subject.message as string}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-border" aria-hidden="true" />

              {/* Dynamic form fields via shared renderer */}
              <FormRenderer
                mode="edit"
                fields={fields}
                density="compact"
                control={control}
                disabled={isPending}
                onAttachmentFilesChange={handleAttachmentChange}
              />
            </div>
          </PaperCanvas>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background/80 px-6 py-3 backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push('/requests')}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
