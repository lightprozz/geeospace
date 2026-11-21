'use client'
// ---------------------------------------------------------------------------
// _components/three-column-builder.tsx
// Builder shell matching the design mockup:
//   · Left rail:  Form Settings (Active Status, SLA, scope, watchers)
//   · Center:     paper canvas with title, description, drag-drop fields
//   · Right rail: Building Blocks (Basic Types, Advanced Selection)
//
// All edits happen in the center canvas; the two rails are auxiliary
// surfaces that the canvas reads from and writes to through callbacks.
//
// Responsive behaviour:
//   · Below `lg` the left rail collapses into a "Settings" sheet.
//   · Below `md` the right rail collapses away and the Save/Cancel actions move
//     into a sticky bar pinned to the bottom of the viewport.
//
// `readOnly` turns the whole shell into a static summary: the title and
// description become plain text, the rails lose their editing affordances and
// no lookup endpoints are queried.
// ---------------------------------------------------------------------------

import { Layers, MoreVertical, Save, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormSettingsRail, type FormSettingsValue } from './form-settings-rail'
import { BuildingBlocksGrid } from './building-blocks-grid'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ThreeColumnBuilderProps {
  title: string
  subtitle?: string
  onTitleChange: (title: string) => void
  onSubtitleChange: (subtitle: string) => void
  fields: unknown[]
  onAddField: (type: number) => void
  onClearFields: () => void
  settings: FormSettingsValue
  onSettingsChange: (s: FormSettingsValue) => void
  isLoading?: boolean
  isSaving?: boolean
  onSave?: () => void
  onCancel?: () => void
  saveLabel?: string
  /** Read-only surfaces render the shell as a static summary. */
  readOnly?: boolean
  /** Rendered inside the center paper, below the title block. */
  children: React.ReactNode
}

export function ThreeColumnBuilder({
  title,
  subtitle,
  onTitleChange,
  onSubtitleChange,
  fields,
  onAddField,
  onClearFields,
  settings,
  onSettingsChange,
  isLoading,
  isSaving,
  onSave,
  onCancel,
  saveLabel = 'Lưu',
  readOnly = false,
  children,
}: ThreeColumnBuilderProps) {
  const hasActions = Boolean(onSave)

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Left: form settings (per design mockup) */}
      <aside className="hidden h-full w-72 shrink-0 flex-col overflow-y-auto border-r bg-card lg:flex">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/10 p-4 backdrop-blur">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" />
            Form Settings
          </h3>
        </div>
        <FormSettingsRail
          value={settings}
          onChange={onSettingsChange}
          isLoading={isLoading}
          isSaving={isSaving}
          readOnly={readOnly}
        />
      </aside>

      {/* Center: paper canvas */}
      <main
        className="relative flex-1 overflow-y-auto bg-[#f8f9fc] dark:bg-[#09090b]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#333_1px,transparent_1px)]"
        />

        {/* Settings trigger — sticky at the top of the canvas below `lg`,
            where the left rail is no longer visible. */}
        <div className="sticky top-0 z-20 flex justify-end px-4 pt-4 lg:hidden">
          <SettingsSheet
            settings={settings}
            onSettingsChange={onSettingsChange}
            isLoading={isLoading}
            isSaving={isSaving}
            readOnly={readOnly}
          />
        </div>

        <div className="relative z-10 mx-auto my-8 w-full max-w-2xl px-4 pb-32">
          {/*
            The empty canvas state lives in `FieldCanvas` (a single empty
            state for the builder). The Save button stays disabled while the
            form has no fields, so no second warning banner is needed here.
          */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="border-b border-border/50 px-8 pb-8 pt-12">
              {readOnly ? (
                <>
                  <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="text-base whitespace-pre-wrap text-muted-foreground">
                      {subtitle}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Tiêu đề biểu mẫu"
                    aria-label="Tiêu đề biểu mẫu"
                    className="mb-4 w-full border-none bg-transparent px-0 text-4xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30 focus:ring-0"
                  />
                  <textarea
                    value={subtitle ?? ''}
                    onChange={(e) => onSubtitleChange(e.target.value)}
                    placeholder="Thêm mô tả hoặc hướng dẫn cho biểu mẫu…"
                    aria-label="Mô tả biểu mẫu"
                    className="min-h-[60px] w-full resize-none border-none bg-transparent px-0 text-base text-muted-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-0"
                  />
                </>
              )}
            </div>

            {children}
          </div>

          {/* End-of-form marker */}
          <div className="mt-8 flex items-center justify-center gap-4 opacity-40">
            <div className="h-px max-w-[100px] flex-1 bg-border" />
            <span className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Kết thúc biểu mẫu
            </span>
            <div className="h-px max-w-[100px] flex-1 bg-border" />
          </div>
        </div>
      </main>

      {/* Right: building blocks (per design mockup) */}
      <aside className="hidden h-full w-72 shrink-0 flex-col border-l bg-card md:flex">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/10 p-4 backdrop-blur">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MoreVertical className="h-4 w-4 text-primary" />
            Building Blocks
          </h3>
          {fields.length > 0 && !readOnly ? (
            <ClearFieldsConfirm
              trigger={
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  Clear all
                </button>
              }
              fieldCount={fields.length}
              onConfirm={onClearFields}
            />
          ) : null}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {readOnly ? null : (
              <>
                <BuildingBlocksGrid onSelect={onAddField} />
                <Separator className="my-6" />
                <ClearFieldsConfirm
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={fields.length === 0}
                      className="w-full border-dashed border-primary text-primary hover:bg-primary/10"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear all fields
                    </Button>
                  }
                  fieldCount={fields.length}
                  onConfirm={onClearFields}
                />
              </>
            )}
          </div>
        </ScrollArea>

        {onSave ? (
          <div className="hidden shrink-0 items-center justify-end gap-2 border-t bg-card p-3 md:flex">
            {onCancel ? (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Hủy
              </Button>
            ) : null}
            <Button onClick={onSave} disabled={isSaving || fields.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Đang lưu…' : saveLabel}
            </Button>
          </div>
        ) : null}
      </aside>

      {/* Sticky action bar — the Save/Cancel actions below `md`. */}
      {hasActions ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t bg-card/95 p-3 backdrop-blur md:hidden">
          {onCancel ? (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Hủy
            </Button>
          ) : null}
          <Button onClick={onSave} disabled={isSaving || fields.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Đang lưu…' : saveLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The left settings rail, presented as a side sheet below `lg` where the
 * rail itself is no longer visible.
 */
function SettingsSheet({
  settings,
  onSettingsChange,
  isLoading,
  isSaving,
  readOnly,
}: {
  settings: FormSettingsValue
  onSettingsChange: (s: FormSettingsValue) => void
  isLoading?: boolean
  isSaving?: boolean
  readOnly?: boolean
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Cài đặt
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Cài đặt biểu mẫu</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4">
          <FormSettingsRail
            value={settings}
            onChange={onSettingsChange}
            isLoading={isLoading}
            isSaving={isSaving}
            readOnly={readOnly}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Confirmation wrapper for the destructive "clear all fields" action.
 *
 * Removing every field is not undoable inside the builder, so both entry
 * points (the rail header link and the dashed button) go through the same
 * dialog instead of clearing the canvas on the first click.
 */
function ClearFieldsConfirm({
  trigger,
  fieldCount,
  onConfirm,
}: {
  trigger: React.ReactNode
  fieldCount: number
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa toàn bộ trường?</AlertDialogTitle>
          <AlertDialogDescription>
            {fieldCount > 0
              ? `Tất cả ${fieldCount} trường hiện có sẽ bị xóa khỏi biểu mẫu. Bạn chỉ có thể khôi phục lại bằng cách lưu và tải lại biểu mẫu.`
              : 'Biểu mẫu hiện chưa có trường nào.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Xóa tất cả</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
