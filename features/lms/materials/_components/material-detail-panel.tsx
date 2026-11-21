'use client'
// ---------------------------------------------------------------------------
// _components/material-detail-panel.tsx
// Right-side detail panel — slide-in animation
// Actions: Preview | Edit | Download | Approve | Delete
// ---------------------------------------------------------------------------

import {
  FileText,
  Video,
  Image,
  Code2,
  HelpCircle,
  Link as LinkIcon,
  X,
  ExternalLink,
  Trash2,
  CheckCircle,
  Eye,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'
import {
  useApproveMaterial,
  useDeleteMaterial,
} from '@/features/lms/hooks/materials/use-materials'
import { usePermission } from '@/features/lms/port-support'
import {
  isApproved,
  getFormatLabel,
  type MaterialListItem,
} from '@/features/lms/types/material'

// ---------------------------------------------------------------------------
// Format config
// ---------------------------------------------------------------------------

const FORMAT_CONFIG: Record<
  number,
  { icon: React.ElementType; color: string }
> = {
  1: { icon: Image, color: 'text-emerald-500' },
  2: { icon: Video, color: 'text-blue-500' },
  3: { icon: FileText, color: 'text-rose-500' },
  4: { icon: LinkIcon, color: 'text-sky-500' },
  5: { icon: Code2, color: 'text-purple-500' },
}

const FALLBACK_FORMAT = { icon: HelpCircle, color: 'text-muted-foreground' }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MaterialDetailPanelProps {
  material: MaterialListItem
  activeTab: 'library' | 'approvals'
  onClose: () => void
  onDeleted: () => void
  onEdit: (material: MaterialListItem) => void
  onPreview: (material: MaterialListItem) => void
}

export function MaterialDetailPanel({
  material,
  activeTab,
  onClose,
  onDeleted,
  onEdit,
  onPreview,
}: MaterialDetailPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: approve, isPending: isApproving } = useApproveMaterial()
  const { mutate: deleteMat, isPending: isDeleting } = useDeleteMaterial()
  const { can } = usePermission()
  const canEditMaterial = can('content.material.write')
  const canApproveMaterial = can('content.material.approve')
  const canDeleteMaterial = can('content.material.delete')

  const cfg =
    material.materialFormat
      ? FORMAT_CONFIG[material.materialFormat] ?? FALLBACK_FORMAT
      : FALLBACK_FORMAT
  const FormatIcon = cfg.icon
  const approved = isApproved(material)
  const ownerName = material.teacherName ?? 'Admin'
  const hasFile = !!material.fileName
  const hasUrl = !!material.url
  const canPreview = hasFile || hasUrl



  return (
    <div
      className={cn(
        'w-80 lg:w-96 shrink-0 border-l bg-card flex flex-col',
        'animate-in slide-in-from-right-5 duration-200',
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3 p-4 border-b">
        <div className={cn('rounded-lg bg-muted p-2 shrink-0', cfg.color)}>
          <FormatIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{material.name}</p>
          {material.materialCategories && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {material.materialCategories}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── Attachment Card ── */}
        {(material.url || material.fileName) && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Attachment
            </p>

            {material.url && (
              <a
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1.5 rounded-xl border border-border/50 bg-gradient-to-b from-muted/10 to-muted/40 p-3 transition-all hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-500">
                    <div className="rounded-md bg-sky-500/10 p-1.5">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">External Link</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-sky-500" />
                </div>
                <span className="text-xs text-muted-foreground truncate px-1">
                  {material.url}
                </span>
              </a>
            )}

            {material.fileName && (
              <div className="group relative flex items-start gap-3 rounded-xl border border-border/50 bg-gradient-to-b from-muted/10 to-muted/40 p-3 transition-all hover:bg-muted/50">
                <div className={cn("rounded-md bg-background shadow-sm border p-2 shrink-0 group-hover:scale-105 transition-transform", cfg.color)}>
                  <FormatIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-xs font-medium leading-tight truncate pr-8" title={material.fileName}>
                    {material.fileName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                    {getFormatLabel(material.materialFormat)} • Document
                  </p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Description */}
        {material.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Description
            </p>
            <p className="text-sm whitespace-pre-wrap">
              {material.description}
            </p>
          </div>
        )}

        <Separator />

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <span className="text-muted-foreground">Owner</span>
          <span className="font-medium">{ownerName}</span>

          <span className="text-muted-foreground">Format</span>
          <span className="font-medium">
            {getFormatLabel(material.materialFormat)}
          </span>

          <span className="text-muted-foreground">Status</span>
          <span
            className={cn(
              'font-medium',
              approved
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {approved ? 'Approved' : 'Pending approval'}
          </span>

          {material.materialCategories && (
            <>
              <span className="text-muted-foreground">Categories</span>
              <span className="font-medium truncate">
                {material.materialCategories}
              </span>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Footer actions ── */}
      <div className="p-3 space-y-2">
        {/* Preview + Edit row */}
        <div className="flex gap-2">
          {canPreview && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={() => onPreview(material)}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          )}
          {activeTab === 'library' && canEditMaterial && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={() => onEdit(material)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>


        {/* Approve (approvals tab only) */}
        {activeTab === 'approvals' && canApproveMaterial && (
          <Button
            size="sm"
            className="w-full text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => approve(material.id, { onSuccess: onClose })}
            disabled={isApproving}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        )}

        {/* Delete — both tabs */}
        {canDeleteMaterial && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete material?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{material.name}</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteMat(material.id, { onSuccess: onDeleted })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
