"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/attachment-field.tsx
// Attachment(6). The field VALUE holds two halves: the files the API already
// holds (`{url, fileName}` — `fileName`, never `name`, that rename belongs to
// the server-side Answers projection) and the browser `File`s the user just
// picked. The picked `File`s never enter the JSON answer — they travel in the
// multipart parts of the submit, so they are ALSO reported to the caller
// through `onFilesChange`.
//
// DOWNLOADS. The API serves request-form attachments from
// `/api/v2/forms/requests/{id}/attachments/{storedName}` behind `[Authorize]`,
// so a plain `<a href>` navigation answers 401 — a browser cannot attach a
// Bearer header to a navigation. Those URLs are fetched with the token
// instead (see `downloadAuthenticated`). Legacy rows carry anonymous
// `/api/media/...` URLs, which stay plain links.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { Paperclip, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { downloadAuthenticated } from "@/lib/api-client"
import {
  decode,
  toAttachmentState,
  type AttachmentEntry,
} from "@/features/lms/lib/requests/field-value"
import type { Field } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

/** The API-held files of an Attachment(6) field, whatever shape it arrives in. */
function storedFiles(field: Field, value: unknown): AttachmentEntry[] {
  return toAttachmentState(decode(field, value)).stored
}

/** v2 request-form attachments are behind `[Authorize]`; legacy media is not. */
function needsAuth(url: string): boolean {
  return url.includes("/attachments/")
}

function AttachmentLink({ entry }: { entry: AttachmentEntry }) {
  const label = entry.fileName || entry.url
  const [error, setError] = useState<string | null>(null)

  if (!entry.url) return <span className="text-sm">{label}</span>

  if (!needsAuth(entry.url)) {
    return (
      <a
        href={entry.url}
        className="text-sm underline underline-offset-4"
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        className="text-sm underline underline-offset-4"
        onClick={() => {
          setError(null)
          downloadAuthenticated(entry.url!, entry.fileName || undefined).catch(() =>
            setError("Download failed."),
          )
        }}
      >
        {label}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}

export function AttachmentFieldInput({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  inputId,
  describedBy,
  invalid,
  density,
  onFilesChange,
  attachmentUploadDisabled,
}: FieldInputProps) {
  // The form value is the single source of truth for BOTH halves: `stored`
  // comes from the API, `pending` from the picker. Holding the picked files in
  // component state as well would let the two disagree — and `validate`
  // counts the form value, so a pending file it cannot see would fail the
  // required check while the UI shows a file selected.
  const state = toAttachmentState(decode(field, value))
  const stored = state.stored
  const isCompact = density === "compact"

  function updatePicked(next: File[]) {
    onChange({ stored, pending: next })
    onFilesChange?.(next)
  }

  function removeStored(index: number) {
    onChange({
      stored: stored.filter((_, i) => i !== index),
      pending: state.pending,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {stored.length > 0 && (
        <ul className="flex flex-col gap-1">
          {stored.map((entry, index) => (
            <li
              key={`${entry.url}-${index}`}
              className="flex items-center gap-2"
            >
              <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
              <AttachmentLink entry={entry} />
              {!disabled && !attachmentUploadDisabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStored(index)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">
                    Remove {entry.fileName || "attachment"}
                  </span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {attachmentUploadDisabled ? (
        <p className="text-xs text-muted-foreground">
          New files cannot be attached at this step. The files already attached
          are shown above.
        </p>
      ) : (
        <>
          <Input
            id={inputId}
            name={field.inputKey}
            type="file"
            multiple={
              field.config?.maxFiles == null || field.config.maxFiles > 1
            }
            disabled={disabled}
            onBlur={onBlur}
            onChange={(event) =>
              updatePicked(Array.from(event.target.files ?? []))
            }
            aria-required={field.required || undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={isCompact ? "h-9 w-full" : "h-7 w-full"}
          />

          {state.pending.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {state.pending.length} file
              {state.pending.length > 1 ? "s" : ""} ready to upload:{" "}
              {state.pending.map((file) => file.name).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export function AttachmentFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  const stored = storedFiles(field, value ?? field.value)

  if (stored.length === 0) return <ReadOnlyValue text="" />

  return (
    <ReadOnlyValue>
      <ul className="flex flex-col gap-1">
        {stored.map((entry, index) => (
          <li key={`${entry.url}-${index}`} className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
            <AttachmentLink entry={entry} />
          </li>
        ))}
      </ul>
    </ReadOnlyValue>
  )
}
