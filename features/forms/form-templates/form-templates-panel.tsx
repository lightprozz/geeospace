"use client"

import { LmsUiScope } from "@/components/ui/lms-ui-scope"
import { useWindowNavigation } from "@/components/desktop/window-navigation"
import { FormsWindowAdapter } from "@/features/forms/window-adapter"
import { useCan, usePermissionsLoaded } from "@/lib/use-can"
import { FormTemplatesPageClient } from "./_components/form-templates-page-client"
import { FormTemplateDetailClient } from "./_components/form-template-detail-client"
import { FormTemplateEditClient } from "./_components/form-template-edit-client"
import NewFormTemplatePage from "./new/page"
import { CollectionsPageClient } from "./collections/_components/collections-page-client"
import { WorkLogTemplatesPageClient } from "./worklog-templates/_components/worklog-templates-page-client"
import { WorkLogTemplateDetailClient } from "./worklog-templates/_components/worklog-template-detail-client"
import NewWorkLogTemplatePage from "./worklog-templates/new/page"
import EditWorkLogTemplatePage from "./worklog-templates/[id]/edit/page"
import { WorkflowBuilderClient } from "./[id]/workflow/_components/workflow-builder-client"
import { TriggersPageClient } from "./[id]/workflow/[stepId]/triggers/_components/triggers-page-client"
import { ApiPreviewClient } from "./[id]/api/api-preview-client"
import { formTemplatesRoutePermission, resolveFormTemplatesRoute } from "./routes"

export function FormTemplatesPanel() {
  const { path } = useWindowNavigation()
  const route = resolveFormTemplatesRoute(path)
  const loaded = usePermissionsLoaded()
  const allowed = useCan(formTemplatesRoutePermission(route))
  const params = "id" in route ? { id: route.id, ...("stepId" in route ? { stepId: route.stepId } : {}) } : {}
  return (
    <LmsUiScope className="flex h-full min-h-0 flex-col">
      {!loaded ? <p className="p-6" role="status">Loading permissions…</p> :
        !allowed ? <p className="p-6" role="alert">You do not have permission to view this template page.</p> :
          <FormsWindowAdapter key={path.split("?")[0]} base="/form-templates" params={params}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {route.screen === "list" ? <FormTemplatesPageClient /> :
                route.screen === "new" ? <NewFormTemplatePage /> :
                route.screen === "collections" ? <CollectionsPageClient /> :
                route.screen === "detail" ? <FormTemplateDetailClient id={route.id} /> :
                route.screen === "edit" ? <FormTemplateEditClient id={route.id} /> :
                route.screen === "workflow" ? <WorkflowBuilderClient templateId={route.id} /> :
                route.screen === "triggers" ? <TriggersPageClient templateId={route.id} processId={route.stepId} /> :
                route.screen === "api" ? <ApiPreviewClient templateId={route.id} /> :
                route.screen === "worklogs" ? <WorkLogTemplatesPageClient /> :
                route.screen === "worklog-new" ? <NewWorkLogTemplatePage /> :
                route.screen === "worklog-detail" ? <WorkLogTemplateDetailClient /> :
                route.screen === "worklog-edit" ? <EditWorkLogTemplatePage /> :
                <p className="p-6" role="alert">Form template page not found.</p>}
            </div>
          </FormsWindowAdapter>}
    </LmsUiScope>
  )
}
