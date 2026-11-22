'use client'
// ---------------------------------------------------------------------------
// _components/form-template-edit-client.tsx
// Form Template editor. Three-column layout: settings rail · paper canvas
// (the single field-editing surface) · building blocks rail.
//
// Active status is saved through its own endpoint (toggle-activate) because
// flipping it should not require a full field replace. Everything else —
// name, description, collection, SLA, campus/group/watcher scope and the field
// list — is saved as one V2 template update.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '@/features/forms/window-adapter'
import { toast } from 'sonner'
import { useTemplate } from '../hooks/use-template'
import {
  useSetActive,
  useUpdateTemplate,
} from '../hooks/use-template-mutations'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import { FieldCanvas } from './field-canvas'
import { ThreeColumnBuilder } from './three-column-builder'
import { buildDefaultConfig } from './field-type-config'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { FormTemplateBreadcrumb } from './form-template-breadcrumb'
import {
  DEFAULT_SETTINGS,
  type FormSettingsValue,
  type SettingsChip,
} from './form-settings-rail'
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
import type { NewField, UpsertField } from '@/features/lms/types/form-template'
import { toApiField, validateTemplate } from '../lib/validation'

interface FormTemplateEditClientProps {
  id: string
}

export function FormTemplateEditClient({ id }: FormTemplateEditClientProps) {
  const router = useRouter()
  const templateQuery = useTemplate(id)
  const updateMutation = useUpdateTemplate(id)
  const activeMutation = useSetActive(id)

  const [fields, setFields] = useState<(UpsertField | NewField)[]>([])
  const [focusFieldKey, setFocusFieldKey] = useState<string | null>(null)
  const [settings, setSettings] = useState<FormSettingsValue>(DEFAULT_SETTINGS)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Tracks the last persisted active flag so the toggle knows whether it needs
  // to call the endpoint or simply record a value for the next full save.
  const persistedActive = useRef<boolean | null>(null)
  const hydrated = useRef(false)
  // Snapshot of the state as it was loaded (or last saved). The builder is
  // dirty when the live state no longer matches it, which drives the
  // `beforeunload` guard and the "unsaved changes" affordance.
  //
  // The snapshot lives in state, not in a ref: the dirty flag is read during
  // render, and a ref read during render is not reactive.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)

  const template = templateQuery.data

  useEffect(() => {
    if (!template || hydrated.current) return
    hydrated.current = true

    setTitle(template.name)
    setDescription(template.description ?? '')

    setSettings({
      slaHours: template.expirationCycle ?? null,
      isActive: !template.deactivate,
      collectionId: template.collectionId ?? null,
      campuses: (template.campus ?? []).map(toCampusChip),
      visibleTo: (template.groups ?? []).map(toGroupChip),
      watchers: (template.watchers ?? []).map(toWatcherChip),
    })
    persistedActive.current = !template.deactivate

    const loadedFields = template.fields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      label: f.label,
      description: f.description ?? null,
      type: f.type,
      inputKey: f.inputKey,
      required: f.required,
      displayOrder: f.displayOrder,
      hidden: f.hidden,
      config: f.config,
    })) as UpsertField[]

    setFields(loadedFields)
    setSavedSnapshot(
      snapshotOf(template.name, template.description ?? '', loadedFields, {
        ...settings,
        slaHours: template.expirationCycle ?? null,
        isActive: !template.deactivate,
        collectionId: template.collectionId ?? null,
        campuses: (template.campus ?? []).map(toCampusChip),
        visibleTo: (template.groups ?? []).map(toGroupChip),
        watchers: (template.watchers ?? []).map(toWatcherChip),
      }),
    )
    // `settings` is intentionally excluded: the snapshot is built from the
    // values just derived from the template, not from the state that has not
    // been applied yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template])

  const currentSnapshot = useMemo(
    () => snapshotOf(title, description, fields, settings),
    [title, description, fields, settings],
  )

  // A null snapshot means the template has not loaded yet, so there is
  // nothing to compare against and nothing to lose.
  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot

  // M2: leaving the builder with unsaved edits needs a confirmation. The hook
  // covers anchor clicks; the Cancel button routes through `requestLeave` so
  // it goes through the same dialog.
  const guard = useUnsavedChangesGuard(isDirty, (href) => router.push(href))

  const handleCancel = () => {
    const target = `/form-templates/${id}`
    if (isDirty) {
      guard.requestLeave(target)
      return
    }
    router.push(target)
  }

  useSetDashboardHeader({
    breadcrumbs: (
      <FormTemplateBreadcrumb
        id={id}
        templateName={template?.name ?? title}
        mode="edit"
      />
    ),
    actions: template ? (
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          template.deactivate
            ? 'bg-amber-100 text-amber-700'
            : 'bg-emerald-100 text-emerald-700'
        }`}
      >
        {template.deactivate ? 'Draft' : 'Active'}
      </span>
    ) : null,
  }, template?.id)

  const handleSave = async () => {
    if (!template) return

    // M4 / FG11 (D12): the rules are checked before the request so the author
    // gets every problem at once instead of a generic 422.
    const validation = validateTemplate({
      name: title,
      fields,
      collectionId: settings.collectionId,
      groups: settings.visibleTo,
      watchers: settings.watchers,
    })

    if (!validation.ok) {
      toast.error('Biểu mẫu chưa hợp lệ', {
        description: validation.errors.slice(0, 5).join('\n'),
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        name: title.trim() || template.name,
        description: description.trim() || null,
        collectionId: settings.collectionId,
        expirationCycle: settings.slaHours,
        campus: settings.campuses.map((c) => ({
          campusId: c.id,
          campusName: c.label,
        })),
        groups: settings.visibleTo.map((g) => ({
          groupId: g.id,
          groupName: g.label,
        })),
        watchers: settings.watchers.map((w) => ({
          userId: w.id,
          fullName: w.label,
          userName: w.userName,
          email: w.email,
        })),
        // `clientId` is browser-only and must not reach the API.
        fields: fields.map((f, i) => toApiField(f, i)),
      })

      // The active toggle is a separate endpoint; only fire it when the user
      // flipped it since the last load, so saving unrelated edits never
      // silently reactivates a deactivated template.
      if (persistedActive.current !== null && persistedActive.current !== settings.isActive) {
        await activeMutation.mutateAsync(settings.isActive)
        persistedActive.current = settings.isActive
      }

      // The state now matches what the server holds, so the dirty guard must
      // not fire on the redirect that follows.
      setSavedSnapshot(currentSnapshot)

      toast.success('Đã lưu thay đổi')
      router.push(`/form-templates/${id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không lưu được thay đổi',
      )
    }
  }

  const handleAddField = (type: number) => {
    // T-H5: a new field gets a stable client id. The canvas keys the React
    // node, the selection and the focus target by it, so a rename or a
    // reorder never re-keys an existing block.
    const clientId = crypto.randomUUID()
    setFocusFieldKey(clientId)
    setFields((prev) => [
      ...prev,
      {
        clientId,
        fieldName: '',
        label: '',
        description: null,
        type,
        inputKey: '',
        required: false,
        displayOrder: prev.length,
        hidden: false,
        config: buildDefaultConfig(type),
      },
    ])
  }

  const handleClearFields = () => {
    setFields([])
  }

  if (templateQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-muted-foreground">Đang tải…</span>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-destructive">Không tìm thấy biểu mẫu</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ThreeColumnBuilder
        title={title}
        subtitle={description}
        onTitleChange={setTitle}
        onSubtitleChange={setDescription}
        fields={fields}
        onAddField={handleAddField}
        onClearFields={handleClearFields}
        settings={settings}
        onSettingsChange={setSettings}
        isSaving={updateMutation.isPending || activeMutation.isPending}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel="Lưu"
      >
        <FieldCanvas
          fields={fields}
          onChange={setFields}
          focusId={focusFieldKey}
        />
      </ThreeColumnBuilder>

      <AlertDialog open={guard.pendingHref !== null} onOpenChange={(open) => {
        if (!open) guard.cancelLeave()
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có thay đổi chưa được lưu</AlertDialogTitle>
            <AlertDialogDescription>
              Nếu bạn rời khỏi trang này, các thay đổi chưa lưu sẽ bị mất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={guard.cancelLeave}>
              Ở lại
            </AlertDialogCancel>
            <AlertDialogAction onClick={guard.confirmLeave}>
              Rời khỏi trang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Serialises the editable state into a comparable string.
 *
 * The builder has no form library, so the snapshot is the simplest reliable
 * way to tell "the author changed something" from "the state merely moved".
 * `clientId` is included because it is part of the field identity.
 */
function snapshotOf(
  name: string,
  description: string,
  fields: (NewField | UpsertField)[],
  settings: FormSettingsValue,
): string {
  return JSON.stringify({
    name,
    description,
    settings: {
      slaHours: settings.slaHours,
      isActive: settings.isActive,
      collectionId: settings.collectionId,
      campuses: settings.campuses.map((c) => c.id),
      visibleTo: settings.visibleTo.map((g) => g.id),
      watchers: settings.watchers.map((w) => w.id),
    },
    fields: fields.map((f) => ({
      id: (f as UpsertField).id ?? null,
      clientId: f.clientId ?? null,
      fieldName: f.fieldName,
      label: f.label,
      description: f.description ?? null,
      type: f.type,
      inputKey: f.inputKey,
      required: f.required,
      hidden: f.hidden,
      config: f.config,
    })),
  })
}

function toCampusChip(c: { campusId: string; campusName?: string | null }): SettingsChip {
  return { id: c.campusId, label: c.campusName || c.campusId }
}

function toGroupChip(g: { groupId: string; groupName?: string | null }): SettingsChip {
  return { id: g.groupId, label: g.groupName || g.groupId }
}

function toWatcherChip(w: {
  userId: string
  fullName?: string | null
  email?: string | null
  userName?: string | null
}): SettingsChip {
  return {
    id: w.userId,
    label: w.fullName || w.email || w.userId,
    hint: w.email ?? undefined,
    email: w.email ?? undefined,
    userName: w.userName ?? undefined,
  }
}
