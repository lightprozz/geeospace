"use client"

import { LmsUiScope } from "@/components/ui/lms-ui-scope"
import { useWindowNavigation } from "@/components/desktop/window-navigation"
import { FormsWindowAdapter } from "@/features/forms/window-adapter"
import { PERMISSIONS } from "@/lib/permissions"
import { useCan, usePermissionsLoaded } from "@/lib/use-can"
import { RequestsPageClient } from "./_components/requests-page-client"
import { RequestNewPageClient } from "./new/_components/request-new-page-client"
import { RequestSubmitClient } from "./new/[templateId]/_components/request-submit-client"
import { RequestDetailClient } from "./[id]/_components/request-detail-client"
import { resolveRequestsRoute } from "./routes"

export function RequestsPanel() {
  const { path } = useWindowNavigation()
  const route = resolveRequestsRoute(path)
  const loaded = usePermissionsLoaded()
  const allowed = useCan(
    route.screen === "new" || route.screen === "submit"
      ? PERMISSIONS.FORMS_REQUEST_WRITE
      : PERMISSIONS.FORMS_REQUEST_READ,
  )
  if (!loaded || !allowed) {
    return (
      <LmsUiScope className="p-6">
        {!loaded ? <p role="status">Loading permissions…</p> :
          <p role="alert">You do not have permission to view this request page.</p>}
      </LmsUiScope>
    )
  }
  return (
    <LmsUiScope className="flex h-full min-h-0 flex-col">
      <FormsWindowAdapter base="/requests">
        <div key={path} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {route.screen === "inbox" ? <RequestsPageClient /> :
            route.screen === "new" ? <RequestNewPageClient /> :
            route.screen === "submit" ? <RequestSubmitClient templateId={route.templateId} /> :
            route.screen === "detail" ? <RequestDetailClient id={route.id} /> :
            <p className="p-6" role="alert">Request page not found.</p>}
        </div>
      </FormsWindowAdapter>
    </LmsUiScope>
  )
}
