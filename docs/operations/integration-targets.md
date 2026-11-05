# GeeO integration targets

Public checks were performed on 2026-10-31 in `Asia/Ho_Chi_Minh`. These routes record discovery and readiness evidence, not enabled connectors or a registered Geeospace client. Do not store credentials here.

| Component | Address | Evidence and limits |
|---|---|---|
| Production login | https://login.gee-o.vn | User-provided; page returned 200. Root discovery returned 404, so this domain is not established as an OIDC issuer |
| Production LMS | https://lms.gee-o.vn | User-provided; page returned 200 and led to Login without authentication. The bundle matched legacy ClientAppv1, not proof of the new Next.js frontend deployment |
| Staging Auth | https://dev-lms.gee-o.vn/auth | Matches staging Authority configuration; discovery returned 200 with this issuer |
| Staging API origin | https://dev-lms.gee-o.vn | Source-matched V2 Worklog route returned 401 on credential-free GET; data, scope, and mutations were not verified |
| Original Auth API configuration | https://auth-api-acad.gee-o.edu.vn | Present in original source configuration but unreachable from the investigation environment; not selected as a verified target |

## Verified staging OIDC discovery

Discovery route: https://dev-lms.gee-o.vn/auth/.well-known/openid-configuration.

Public metadata exposed authorize, token, userinfo, and endsession under `/auth/connect/`, with `authorization_code` and PKCE `S256`. This establishes server capability, not permission for arbitrary clients to use that flow. Geeospace must require S256 rather than accepting plain because metadata lists it.

`AuthAPI/Startup.cs` loads in-memory clients through `IdentityServerConfig.GetClients(Configuration)`. Investigated source had three clients using password/external_api/passwordless or token_exchange, without an identified Geeospace code-flow client and redirect/logout allowlists. Do not reuse LMS/token-exchange clients to bypass the BFF design. Geeospace issuer/client configuration is not enabled; its auth route remains fail-closed.

## Frontend and API route distinction

The public `lms.gee-o.vn/static/js/main.7e77a339.chunk.js` bundle matched checksum and 815096-byte size of `GitHub/oldsource/ClientAppv1/build/static/js/main.7e77a339.chunk.js`. Do not infer new frontend routes, class IDs, or sessions from this legacy artifact. Confirm the new GeeO-LMS-FE deployment and destination policy before LMS handoff.

A workspace example used `/api/v2/working-time/query`, which returned 404 during GET investigation and is not the source-defined Worklog query route. Frontend callers/controller identify `POST /api/v2/working-time/worklog/query`; credential-free GET to `worklog/shift-options` returned 401. Do not probe using POST or treat 401 as proof of a user's authorization.

## Outstanding prerequisites

- Register the Geeospace code+PKCE client, redirect/logout allowlists, scope/audience, and login interaction ownership. Metadata does not replace authorize → callback → token verification.
- Confirm Geeospace staging origin, new LMS frontend target, and executing Auth/SQL owners. Deployment documentation ownership does not establish individual service/database operations ownership.
- Verify cookies, sessions, refresh/revocation, actor/object/campus permissions, business sources, and recovery in an authorized environment. Do not extract public-client secrets or send upstream tokens to the browser.

See [service ownership](./service-owners.md) and [identity boundaries](../architecture/platform-foundation.md#cross-app-identity-invariants-and-open-decisions). Discovery evidence is historical and does not establish current service availability.
