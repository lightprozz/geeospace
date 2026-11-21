'use client'
// ---------------------------------------------------------------------------
// _components/request-discussion.tsx
// Threaded comment list with attachment previews and a comment input.
// Threads derived from flat comments in the parent client shell.
//
// PARITY (old TPM `chat-message-input.tsx`):
//   - at most 3 files per comment,
//   - only the accepted content types may be picked,
//   - a comment with NO text is allowed as long as it carries a file,
//   - images are previewed as thumbnails before sending.
//
// DOWNLOADS. A v2 comment attachment lives behind
// `/api/v2/forms/requests/{id}/attachments/{storedName}` and the endpoint is
// `[Authorize]`d, so a plain `<a href>` navigation answers 401 — a browser
// cannot attach a Bearer header to a navigation. Those URLs are fetched with
// the token instead (see `downloadAuthenticated`). Legacy rows carry anonymous
// `/api/media/...` URLs, which stay plain links.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Paperclip, Send, MessageSquare, X } from "lucide-react"
import { toast } from "sonner"

import { useAddComment } from "@/features/lms/hooks/requests/use-request-mutations"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadAuthenticated } from "@/lib/api-client"
import { getErrorDetail } from "@/features/lms/lib/requests/api"
import { cn } from "@/lib/utils"
import { RequestFormStatus, type CommentDto } from "@/features/lms/types/request"
import type { CommentThread } from "./request-detail-client"

// ---------------------------------------------------------------------------
// Attachment rules
// ---------------------------------------------------------------------------

/** The old TPM composer capped a comment at 3 files. */
const MAX_COMMENT_FILES = 3

/**
 * The accepted content types, mirrored from the API's own allow-list
 * (`RequestsController.AllowedAttachmentTypes`). A type the API rejects would
 * only fail the whole upload with a 400, so the picker filters it out up front.
 */
const ALLOWED_COMMENT_TYPES: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
}

/**
 * The `accept` attribute of the picker. The old TPM composer offered two
 * pickers — one for images (`image/jpeg,image/png,image/jpg`) and one for
 * office/text/pdf — and the FE parity rule names that union. The API's own
 * extra types (`.gif`, `.webp`, `.csv`) are added so a file the server accepts
 * is never hidden from the user.
 */
const COMMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  ...Object.values(ALLOWED_COMMENT_TYPES).flat(),
].join(",")

/** The extension of a file name, lowercased. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot < 0 ? "" : name.slice(dot).toLowerCase()
}

/**
 * True when the API would accept this file: its declared type must be known
 * AND its extension must match that type.
 */
function isAllowedCommentFile(file: File): boolean {
  const declared = (file.type || "").split(";")[0].trim().toLowerCase()
  const extensions = ALLOWED_COMMENT_TYPES[declared]
  if (!extensions) return false
  return extensions.includes(extensionOf(file.name))
}

/** v2 request-form attachments are behind `[Authorize]`; legacy media is not. */
function needsAuth(url: string): boolean {
  return url.includes("/attachments/")
}

// ---------------------------------------------------------------------------
// Comment attachment link
// ---------------------------------------------------------------------------

function CommentAttachmentLink({
  url,
  fileName,
}: {
  url: string
  fileName: string
}) {
  const [error, setError] = useState<string | null>(null)

  if (!needsAuth(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      >
        <Paperclip className="h-3 w-3" aria-hidden="true" />
        {fileName}
      </a>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setError(null)
          downloadAuthenticated(url, fileName || undefined).catch(() =>
            setError("Download failed."),
          )
        }}
        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      >
        <Paperclip className="h-3 w-3" aria-hidden="true" />
        {fileName}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Comment bubble
// ---------------------------------------------------------------------------

function CommentBubble({
  comment,
  isReply = false,
}: {
  comment: CommentDto
  isReply?: boolean
}) {
  return (
    <div className={cn("flex gap-2.5", isReply && "pl-6")}>
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {comment.fullName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{comment.fullName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdDate).toLocaleString()}
          </span>
        </div>

        {comment.content && (
          <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
        )}

        {/* Attachments */}
        {comment.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {comment.attachments.map((att, i) => (
              <CommentAttachmentLink
                key={`${att.url}-${i}`}
                url={att.url}
                fileName={att.fileName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Picked-file preview
// ---------------------------------------------------------------------------

/** An image preview of a picked file, released when the preview unmounts. */
function PickedFilePreview({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  const isImage = file.type.startsWith("image/")

  // The preview URL is DERIVED from the file, not state: it changes only when
  // the file changes, so it is created once per file and released when this
  // preview goes away. Keeping it out of state also keeps the render pure —
  // a `setState` inside the effect would only re-render to publish a value
  // that was already known.
  const preview = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage]
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded border bg-muted/40">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={file.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-foreground/60 p-0.5 text-background hover:bg-foreground/80"
      >
        <X className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">Remove {file.name}</span>
      </button>

      <span className="sr-only">{file.name}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comment composer — shared by the root composer and the inline reply
// ---------------------------------------------------------------------------

function CommentComposer({
  requestId,
  rootId,
  placeholder,
  onCancel,
  onSuccess,
}: {
  requestId: string
  rootId?: string
  placeholder: string
  onCancel?: () => void
  onSuccess: (comment: CommentDto) => void
}) {
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mutation = useAddComment()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    // Reset so picking the same file again still fires a change event.
    e.target.value = ""
    if (selected.length === 0) return

    const allowed = selected.filter(isAllowedCommentFile)
    const denied = selected.filter((f) => !isAllowedCommentFile(f))

    const room = MAX_COMMENT_FILES - files.length
    if (allowed.length > room) {
      setRejected(
        `At most ${MAX_COMMENT_FILES} files can be attached to a comment.`,
      )
    } else {
      setRejected(
        denied.length > 0
          ? `${denied.map((f) => f.name).join(", ")} — unsupported file type.`
          : null,
      )
    }

    setFiles((prev) => [...prev, ...allowed].slice(0, MAX_COMMENT_FILES))
  }

  const handleSubmit = async () => {
    // A comment with only a file is allowed — the API accepts "content, an
    // attachment, or both".
    if (!content.trim() && files.length === 0) return

    try {
      const comment = await mutation.mutateAsync({
        id: requestId,
        input: {
          content: content.trim(),
          rootId,
          files: files.length > 0 ? files : undefined,
        },
      })
      setContent("")
      setFiles([])
      setRejected(null)
      onSuccess(comment as CommentDto)
    } catch (err) {
      // The server states WHY a write was refused; a generic sentence hides it
      // from the person who has to fix it.
      toast.error(getErrorDetail(err, "Failed to send comment."))
    }
  }

  const canSend = (content.trim().length > 0 || files.length > 0) && !mutation.isPending

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="resize-none text-sm"
      />

      {/* Attachment previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <PickedFilePreview
              key={`${f.name}-${i}`}
              file={f}
              onRemove={() =>
                setFiles((prev) => prev.filter((_, index) => index !== i))
              }
            />
          ))}
        </div>
      )}

      {rejected && (
        <p role="alert" className="text-xs text-destructive">
          {rejected}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {/* Attach button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={COMMENT_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={mutation.isPending || files.length >= MAX_COMMENT_FILES}
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            Attach
          </Button>
          <span className="text-xs text-muted-foreground">
            {files.length}/{MAX_COMMENT_FILES}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onCancel}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleSubmit}
            disabled={!canSend}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Discussion component
// ---------------------------------------------------------------------------

interface RequestDiscussionProps {
  requestId: string
  threads: CommentThread[]
  isLoading: boolean
  /**
   * The request's form status. Once the request reaches
   * `RequestFormStatus.DoneDenied` the server refuses new comments with
   * `REQUEST_TERMINAL`, so the composer is hidden rather than left to fail.
   */
  formStatus: number
}

export function RequestDiscussion({
  requestId,
  threads,
  isLoading,
  formStatus,
}: RequestDiscussionProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const handleCommentAdded = useCallback(() => {
    // The query will be invalidated by the mutation
  }, [])

  const isDiscussionClosed = formStatus >= RequestFormStatus.DoneDenied

  const commentCount = useMemo(
    () => threads.reduce((acc, t) => acc + 1 + t.replies.length, 0),
    [threads],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold">
          Discussion
          {commentCount > 0 && (
            <span className="ml-1 font-normal text-muted-foreground">
              ({commentCount})
            </span>
          )}
        </h3>
      </div>

      {isDiscussionClosed && (
        <p className="text-xs text-muted-foreground">
          This request is closed — new comments are no longer accepted.
        </p>
      )}

      {/* Root comment input */}
      {!isDiscussionClosed && (
        <CommentComposer
          requestId={requestId}
          placeholder="Add a comment..."
          onSuccess={handleCommentAdded}
        />
      )}

      {/* Thread list */}
      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {threads.map((thread) => (
            <div key={thread.root.id} className="flex flex-col gap-2">
              {/* Root comment */}
              <CommentBubble comment={thread.root} />

              {/* Replies */}
              {thread.replies.map((reply) => (
                <div key={reply.id}>
                  <CommentBubble comment={reply} isReply />
                </div>
              ))}

              {/* Reply button / inline reply input */}
              {isDiscussionClosed ? null : replyingTo === thread.root.id ? (
                <div className="mt-2 pl-6">
                  <CommentComposer
                    requestId={requestId}
                    rootId={thread.root.id}
                    placeholder="Write a reply..."
                    onCancel={() => setReplyingTo(null)}
                    onSuccess={() => {
                      setReplyingTo(null)
                      handleCommentAdded()
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="ml-10 mt-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setReplyingTo(thread.root.id)}
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
