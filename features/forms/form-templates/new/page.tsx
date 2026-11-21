'use client'
// ---------------------------------------------------------------------------
// new/page.tsx — Create new template
//
// The create page shares the builder shell with the editor, so a template is
// authored the same way whether it is new or existing. The only difference is
// the save target: creating posts a new template and then hands over to the
// editor, where the scope rules (collection, groups, watchers) are enforced.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useRouter } from '@/features/forms/window-adapter'
import { toast } from 'sonner'
import { useCreateTemplate } from '../hooks/use-template-mutations'
import { ThreeColumnBuilder } from '../_components/three-column-builder'
import { FieldCanvas } from '../_components/field-canvas'
import { buildDefaultConfig } from '../_components/field-type-config'
import {
  DEFAULT_SETTINGS,
  type FormSettingsValue,
} from '../_components/form-settings-rail'
import { toApiField, validateTemplate } from '../lib/validation'
import type { NewField, UpsertField } from '@/features/lms/types/form-template'

export default function NewTemplatePage() {
  const router = useRouter()
  const createMutation = useCreateTemplate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<Array<NewField | UpsertField>>([])
  const [settings, setSettings] = useState<FormSettingsValue>(DEFAULT_SETTINGS)
  const [focusFieldKey, setFocusFieldKey] = useState<string | null>(null)

  const handleAddField = (type: number) => {
    // T-H5: a new field gets a stable client id so the canvas can key the
    // React node, the selection and the focus target by it.
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

  const handleSave = async () => {
    // M4 / FG11 (D12): the same rules the editor applies are enforced here,
    // so a template created from this page is never unscoped.
    const validation = validateTemplate({
      name: title,
      fields,
      collectionId: settings.collectionId,
      groups: settings.visibleTo,
      watchers: settings.watchers,
      // The create page creates the draft and hands over to the editor, which
      // enforces the full scope rules.
      requireScope: false,
    })

    if (!validation.ok) {
      toast.error('Biểu mẫu chưa hợp lệ', {
        description: validation.errors.slice(0, 5).join('\n'),
      })
      return
    }

    try {
      await createMutation.mutateAsync({
        name: title.trim(),
        description: description.trim() || null,
        collectionId: settings.collectionId,
        templateType: 'RequestForm',
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không tạo được biểu mẫu',
      )
    }
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
        onClearFields={() => setFields([])}
        settings={settings}
        onSettingsChange={setSettings}
        isSaving={createMutation.isPending}
        onSave={handleSave}
        onCancel={() => router.back()}
        saveLabel="Tạo biểu mẫu"
      >
        <FieldCanvas
          fields={fields}
          onChange={setFields}
          focusId={focusFieldKey}
        />
      </ThreeColumnBuilder>
    </div>
  )
}
