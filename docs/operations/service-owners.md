# Service ownership and activation prerequisites

The workspace guide identifies DevOps / Infrastructure Team as the deployment documentation owner, but executing Auth/SQL owners and backup receipts remain unconfirmed. The roles below must be assigned during integration; they do not establish existing ownership or SLAs. [Integration targets](./integration-targets.md) records Auth/API staging discovery, so those URLs need not be rediscovered from scratch.

| Role | Decision to confirm | Gate |
|---|---|---|
| Gee-O Auth owner | Verified staging issuer; code+PKCE client, callbacks, scopes, cross-app session ownership, standalone/iframe login, logout/disable/revoke | Before identity acceptance and private data in each app |
| GeeO API/LMS owner | Verified staging API; new Next.js frontend target, object/campus scope, route IDs, exact teacher assignment | Before identity/calendar integration |
| SQL Server operations | Affected database/context, backup permissions, restore rehearsal, RPO/RTO | Before the first backend schema change or bulk write |
| Request/discrepancy recipient | Allowed template, receiving person/unit, and tracking route | Before enabling the action |
| Publisher/assignment manager | Central permissions, course content, quiz rules, assignment/revocation | Before learning publication and assignment |
| Notification publisher | Audience, validity, rule/version, and responsible processor | Before durable notification delivery |
| Dify Cloud owner | App URL/type, authorized documents, tool credential | Before Dify integration |
| Payroll business owner | Formulas, input sources, publication workflow | Before full payroll backend acceptance; does not block other modules |
| SpaceOS and app owners | Artifact/origin, build and runtime configuration, bridge compatibility, summary-owner transition, access checks, compatible rollback | Before independent app integration/rollout |
| Update runtime/source owners | Snapshot boundary, identity/revision, audience, freshness, replay/reconciliation, and transport/broker if needed | During update implementation; producer research remains later |
| Product/UX owner | Representative U1/U2 participants, task baselines, devices/networks, completion criteria | Before each validation round |
| Operations/support owner | Target load, budgets/SLOs, alert recipients, correlation IDs, incident/rollback, rehearsed RPO/RTO | Before production rollout |
| HR/learning data owner | Data classification, access, retention/deletion/export, audit, discrepancy support route | Before processing the relevant data |

Notifications currently remain in-app; email/push and invented SLAs are outside scope. Unassigned business roles must not be replaced with fabricated administrator access.

One person/team may hold several roles. This table does not create a new organization or prove assignment. Before activation, record the executing owner and support route in the environment/module record. Keep secrets and employee records out of tickets/logs. [Architecture](../architecture/platform-foundation.md) owns responsibilities; [app development](../design/spaceos-app-development.md) owns acceptance evidence.

Internal SaaS quality does not require commercial billing/tenancy. Access reviews cover joiners, role/campus changes, leavers, and disabled accounts across both presentation modes. Local health/backup checks do not establish business availability or recovery on provisioned environments.
