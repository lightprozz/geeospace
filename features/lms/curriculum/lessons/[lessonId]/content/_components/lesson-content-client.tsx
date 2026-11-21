'use client'
// ---------------------------------------------------------------------------
// _components/lesson-content-client.tsx
// Full-page lesson content form with Tiptap editors + worksheet + media
// Handles both CREATE (initialContent = null) and UPDATE (initialContent set)
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback } from 'react'
import { useRouter } from '@/features/lms/port-support'
import { useForm, Controller } from 'react-hook-form'
import { Clock, Loader2, Paperclip, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

import { TiptapEditor } from '@/features/lms/curriculum/tiptap-editor'
import { useSaveLessonContent } from '@/features/lms/hooks/curriculum/use-lesson-content'
import { useUploadWorksheet, useDeleteWorksheet } from '@/features/lms/hooks/curriculum/use-lesson-plans'
import { fetchLessonContent } from '@/features/lms/lib/curriculum/api'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { MediaList } from './media-list'
import { OldVersionSelector } from './old-version-selector'
import type { LessonDetail, LessonContentDto, RelatedLesson } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Props & defaults
// ---------------------------------------------------------------------------

interface LessonContentClientProps {
  lesson: LessonDetail
  initialContent: LessonContentDto | null
  oldVersions: RelatedLesson[]
  lessonId: string
}

function buildDefaultContent(lessonId: string): LessonContentDto {
  return {
    id: null,
    lessonPlanId: lessonId,
    textbook: '',
    page: '',
    coreWords: '',
    keyWords: '',
    keyQuestions: '',
    keyAnswers: '',
    activities: '',
    media: '[]',
  }
}

function parseMediaUrls(mediaJson: string | null | undefined): string[] {
  try {
    return JSON.parse(mediaJson ?? '[]') as string[]
  } catch {
    return [] // Guard against legacy malformed JSON
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LessonContentClient({
  lesson,
  initialContent,
  oldVersions,
  lessonId,
}: LessonContentClientProps) {
  const router = useRouter()
  const { can } = usePermission()
  const canUpdateContent = can(PERMISSIONS.CURRICULUM_UPDATE)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaUrls, setMediaUrls] = useState<string[]>(
    parseMediaUrls(initialContent?.media ?? null),
  )

  const { mutate: saveContent, isPending: isSaving } = useSaveLessonContent(lessonId)
  const { mutate: uploadWs, isPending: isUploading } = useUploadWorksheet(lessonId)
  const { mutate: deleteWs, isPending: isDeletingWs } = useDeleteWorksheet(
    lessonId,
    lesson.levelId,
  )

  const defaultValues = initialContent ?? buildDefaultContent(lessonId)

  const { register, handleSubmit, control, reset } = useForm<LessonContentDto>({
    defaultValues,
  })

  // ── Old version copy ────────────────────────────────────────────────────
  const handleOldVersionSelect = useCallback(
    async (selectedLessonId: string | null) => {
      if (!selectedLessonId) {
        // Reset to current version
        reset(initialContent ?? buildDefaultContent(lessonId))
        setMediaUrls(parseMediaUrls(initialContent?.media ?? null))
        return
      }

      try {
        const oldContent = await fetchLessonContent(selectedLessonId)
        if (!oldContent) return

        // Copy content but KEEP current lessonPlanId and clear id (treat as new)
        reset({
          ...oldContent,
          id: null,
          lessonPlanId: lessonId,
        })
        setMediaUrls(parseMediaUrls(oldContent.media))
        toast.info('Old version content loaded — review and save to apply')
      } catch {
        toast.error('Failed to load old version content')
      }
    },
    [initialContent, lessonId, reset],
  )

  // ── Submit ──────────────────────────────────────────────────────────────
  function onSubmit(values: LessonContentDto) {
    saveContent({
      ...values,
      media: JSON.stringify(mediaUrls), // re-serialize media array to JSON string
    })
  }

  // ── Worksheet ───────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadWs(file)
    e.target.value = ''
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-primary tracking-tight uppercase">Lesson Content</h2>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">Lesson {lesson.lesson}</span>
            <span className="mx-2 text-border">•</span>
            <span>{lesson.subject}</span>
            <Badge variant="secondary" className="ml-3 text-xs gap-1">
              <Clock className="h-3 w-3" />
              {/* lessonTime may not be on the type yet */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(lesson as any).lessonTime ?? '—'} min
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {initialContent?.id ? (
            <Badge variant="secondary" className="text-xs px-3 py-1">Editing</Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-3 py-1">New</Badge>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Old version selector (amber banner — only if relevant) */}
          {canUpdateContent && oldVersions.length > 0 && (
            <div className="px-6 pt-3">
              <OldVersionSelector
                oldVersions={oldVersions}
                onSelect={handleOldVersionSelect}
              />
            </div>
          )}

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 py-5">
            {/* ── Left column: rich text editors ─── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Textbook + Page — plain inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lc-textbook" className="text-xs">Textbook</Label>
                  <Input
                    id="lc-textbook"
                    placeholder="e.g. Super Kids 1"
                    className="h-8 text-sm"
                    {...register('textbook')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lc-page" className="text-xs">Page</Label>
                  <Input
                    id="lc-page"
                    placeholder="e.g. 24"
                    className="h-8 text-sm"
                    {...register('page')}
                  />
                </div>
              </div>

              {/* Tiptap fields — one per HTML content column */}
              {[
                { name: 'coreWords' as const,    label: 'Core Words',    ph: 'List core vocabulary...' },
                { name: 'keyWords' as const,     label: 'Key Words',     ph: 'Key words for this lesson...' },
                { name: 'keyQuestions' as const, label: 'Key Questions', ph: 'Main questions to explore...' },
                { name: 'keyAnswers' as const,   label: 'Key Answers',   ph: 'Expected answers...' },
                { name: 'activities' as const,   label: 'Activities',    ph: 'Describe lesson activities...' },
              ].map(({ name, label, ph }) => (
                <div key={name} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Controller
                    name={name}
                    control={control}
                    render={({ field }) => (
                      <TiptapEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder={ph}
                        minHeight="min-h-[100px]"
                      />
                    )}
                  />
                </div>
              ))}
            </div>

            {/* ── Right column: media + worksheet ── */}
            <div className="space-y-5">

              {/* Media URLs */}
              <div className="space-y-1.5">
                <Label className="text-xs">Media Links</Label>
                <MediaList value={mediaUrls} onChange={setMediaUrls} />
              </div>

              <Separator />

              {/* Worksheet */}
              <div className="space-y-2">
                <Label className="text-xs">Worksheet File</Label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {lesson.worksheetFileName ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs flex-1 truncate">{lesson.worksheetFileName}</span>
                    </div>
                    {canUpdateContent && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-full text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => deleteWs(undefined)}
                        disabled={isDeletingWs}
                      >
                        {isDeletingWs
                          ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        }
                        Remove worksheet
                      </Button>
                    )}
                  </div>
                ) : canUpdateContent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Paperclip className="h-3.5 w-3.5" />
                    }
                    Upload PDF worksheet
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Sticky footer ─────────────────────────────────────────── */}
          <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {canUpdateContent && (
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />
                }
                Save Content
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
