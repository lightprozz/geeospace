# Gee-O LMS data layer

This is the shared frontendv2 data layer for LMS desktop panels. Import domain
APIs and query keys from `lib/<domain>/`, React Query hooks from
`hooks/<domain>/`, local state from `stores/`, and DTOs from `types/`. Shared
form collections used by both Requests and Form Templates are in
`hooks/form-templates/use-collections.ts`.

## Wiring an LMS panel

Desktop windows already run under `LmsProvider`, which installs the browser
transport, shares a query cache, clears it on auth reset, and hosts Sonner.
Wrap shadcn panel contents in `LmsUiScope`. Use `PermissionGuard` for a panel's
read permission and `usePermission` or `useCan` for its actions, with constants
from `lib/permissions.ts`. The API remains responsible for enforcing access.

For a new host outside the desktop:

1. Before mounting LMS panels, register the platform's authenticated browser
   adapter with `configureLmsTransport({ request, resolveUrl })`. There is no
   unauthenticated fallback. Use the platform's URL configuration,
   authentication and retry behavior; do not register a token or user-specific
   closure. Requests accept plain JSON or `FormData`; do not set a multipart
   content type manually. For `responseType: "void"`, allow an empty success
   body. Preserve the platform's `ApiError` name, status and ProblemDetails so
   Requests and Worklog can identify concurrency conflicts and business rules.
   `resolveUrl` builds file links only; use the platform's authenticated
   download helper for protected files.
2. Mount hooks below the platform's React Query provider in a Client
   Component. Reset the query cache when the active identity changes. Clear
   the exam and report draft stores on logout or account switches before
   another user can access the workspace; these stores persist to localStorage.
3. For Roles, call `getRolePermissionKeys(PERMISSIONS)` using the platform's
   permission catalog instead of keeping a second list.

This layer does not mount any components or make requests on import.

For attendance reports, pass the active class and lesson log to
`useStudentReport(classId, logId)` and include both IDs in
`useSaveStudentLessonLog()` mutation variables.
