# Forms source import inventory

Paths are relative to `/home/ubuntu/src/app/(dashboard)/`. Static import inventory, not export compatibility verification. Existing domain imports resolve after rewriting to `@/features/lms/`; renderer imports resolve at `@/features/forms/form-renderer`. Relative and source-internal imports move with the UI. Next navigation/link and nuqs exist but still need window-navigation adaptation.

## Missing modules and importing files

`@/components/layout/dashboard-header-context`:
- `requests/[id]/_components/request-detail-client.tsx`
- `requests/_components/requests-page-client.tsx`
- `requests/new/[templateId]/_components/request-submit-client.tsx`
- `requests/new/_components/request-new-page-client.tsx`
- `form-templates/[id]/api/api-preview-client.tsx`
- `form-templates/[id]/workflow/[stepId]/triggers/_components/triggers-page-client.tsx`
- `form-templates/[id]/workflow/_components/workflow-builder-client.tsx`
- `form-templates/_components/form-template-detail-client.tsx`
- `form-templates/_components/form-template-edit-client.tsx`
- `form-templates/collections/_components/collections-page-client.tsx`
- `form-templates/worklog-templates/[id]/edit/page.tsx`
- `form-templates/worklog-templates/_components/worklog-template-detail-client.tsx`
- `form-templates/worklog-templates/_components/worklog-templates-page-client.tsx`
- `form-templates/worklog-templates/new/page.tsx`

`@/hooks/use-debounced-value`:
- `form-templates/[id]/workflow/_components/approver-picker.tsx`

`@xyflow/react`:
- `form-templates/[id]/workflow/_components/edges/deny-branch-edge.tsx`
- `form-templates/[id]/workflow/_components/nodes/approval-step-node.tsx`
- `form-templates/[id]/workflow/_components/nodes/end-node.tsx`
- `form-templates/[id]/workflow/_components/nodes/start-node.tsx`
- `form-templates/[id]/workflow/_components/workflow-diagram-canvas.tsx` (also imports `@xyflow/react/dist/style.css` and `dagre`)
- `form-templates/[id]/workflow/lib/graph-utils.test.ts`
- `form-templates/[id]/workflow/lib/graph-utils.ts`

`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`:
- `form-templates/_components/field-canvas.tsx`

The source declares `@types/dagre` as well; that will be needed for the diagram's typed dagre import.

## Shared runtime and permissions (PR #6 base)

`lib/permissions.ts` and `lib/use-can.ts` now exist on the merged PR #6 branch. They provide the permission catalog and single/any/all/loaded/template-write/request-write helpers backed by `components/auth/permission-guard.tsx` and the existing permission store. The renderer imports shared `PERMISSIONS.CLASS_READ`, `useCan`, and `usePermissionsLoaded` directly; no local stand-in remains.

`components/providers/lms-provider.tsx` is mounted above desktop windows by `desktop-workspace.tsx`. It owns the QueryClient, auth-reset cache clearing and scoped Toaster. `features/lms/lib/browser-transport.ts` bridges configureLmsTransport to apiFetch and API_URL. Renderer tests use local QueryClientProvider wrappers and do not call the API. Future panels still need their own LmsUiScope content wrappers.
