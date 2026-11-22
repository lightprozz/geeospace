'use client'
// ---------------------------------------------------------------------------
// components/composed/tiptap-editor.tsx
// Reusable Tiptap rich-text editor — shared across Curriculum module
// Supports HTML content fields with optional toolbar for formatting
// ---------------------------------------------------------------------------

import { useEditor, EditorContent } from '@tiptap/react'
import { memo, useEffect, useRef } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface TiptapEditorProps {
  value: string          // HTML string (initial content)
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string     // default: 'min-h-[120px]'
  disabled?: boolean
  /** Show formatting toolbar (Bold, Italic, Underline, Lists) */
  showToolbar?: boolean
}

export const TiptapEditor = memo(function TiptapEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 'min-h-[120px]',
  disabled = false,
  showToolbar = false,
}: TiptapEditorProps) {
  // Track whether the current value change originated from the editor itself
  const isInternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? 'Enter content...',
      }),
    ],
    content: value,
    editable: !disabled,
    // Required in Next.js SSR — prevents hydration mismatch
    // Tiptap detects SSR and throws if this is not explicitly set to false
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      isInternalUpdate.current = true
      const html = ed.getHTML()
      // '<p></p>' = Tiptap empty state → store as empty string for clean DB storage
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2',
          minHeight,
          className,
        ),
      },
    },
  })

  // Sync external value changes into Tiptap (e.g. API data load)
  useEffect(() => {
    if (!editor || isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    const currentHtml = editor.getHTML()
    const normalizedCurrent = currentHtml === '<p></p>' ? '' : currentHtml
    if (value !== normalizedCurrent) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background transition-shadow',
        'focus-within:ring-1 focus-within:ring-ring',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
      // Prevent Tiptap keyboard shortcuts (Ctrl+B, Ctrl+I, etc.) from
      // bubbling up to app-level shortcut handlers
      onKeyDown={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.stopPropagation()
        }
      }}
    >
      {/* Optional Formatting Toolbar */}
      {showToolbar && editor && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              editor.isActive('bold') && 'bg-accent text-accent-foreground',
            )}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              editor.isActive('italic') && 'bg-accent text-accent-foreground',
            )}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              editor.isActive('underline') && 'bg-accent text-accent-foreground',
            )}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-4" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              editor.isActive('bulletList') && 'bg-accent text-accent-foreground',
            )}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7',
              editor.isActive('orderedList') && 'bg-accent text-accent-foreground',
            )}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
})
