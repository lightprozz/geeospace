# Local Workers and builds

`npm run cf:build` builds Next.js and the OpenNext adapter. `npm run cf:preview` serves local Workers at 127.0.0.1:8787 with local D1/R2, creating no remote resources. `npm run test:smoke:worker` manages its preview server lifecycle.

[Wrangler configuration](../../wrangler.jsonc) uses nodejs_compat, OpenNext assets, a self-reference service, and DB/LEARNING_FILES bindings. `local-geeospace` identifies the local simulator only. Do not deploy that configuration unchanged to a real account.

Production requires confirmed accounts/resource IDs, domains, secret management, auth, business sources, and real backup/recovery. A local build does not authorize deployment. Establish staging/production targets and rollback before executing.

Do not use `export const runtime = "edge"` for OpenNext routes. Private data must not use ISR/shared caching; workspace pages are dynamic. `/api/auth/login` returns a non-cacheable 503 problem. Each private-data handler needs auth/policy before integration.

Node/workerd may require localhost-port permission in a sandbox. Record EPERM as an environment limitation rather than faking tests or cycling ports. Next uses 3100; Workers uses 8787.

## Staging and rollback preparation

No staging target has been provisioned through this workflow. These are preparation requirements, not a completed deployment. Confirm account, environment, domain, bindings, and access. Auth owners register callback/logout and PKCE client settings; secrets stay in target secret management, never chat/client bundles.

Before release, retain source revision (or archive if Git is unavailable), lockfile, successfully built artifact, and checksum. Preserve the previous artifact and compatible binding/version configuration. Record a deployment receipt through the owner-confirmed operating route. Local resource IDs are not staging targets.

After rollout, verify health, HTTP 404, no-store, login/callback/logout, actor/object permissions, and browser journeys on the target domain. Roll back through its operational route to a receipt-verified, schema-compatible artifact, then repeat affected checks. Migrations follow [platform recovery requirements](../architecture/platform-foundation.md#migration-and-recovery-before-real-data). Without a target/receipt, do not claim a successful staging rollback rehearsal.
