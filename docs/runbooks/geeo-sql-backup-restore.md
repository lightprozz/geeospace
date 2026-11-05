# GeeO SQL Server backup and restore gate

No GeeO database has been accessed or changed through this workflow. Operations owner, database/context, backup route, and restore permissions remain unconfirmed. This is a prerequisite checklist, not evidence of successful recovery.

Before any AuthAPI/GeeO migration, seed, or bulk update, confirm the development/staging/production target, affected databases/contexts, consistent snapshot point, retention, and isolated restore destination. Never record connection strings or credentials in docs/logs.

The owner takes a backup through GeeO's existing operating route, records receipt/time/checksum where available, and rehearses restore into a separate database. Compare schema, record totals, and domain integrity. Measure RPO/RTO rather than inventing values. Confirm any write-freeze window and resumption with the operator.

Continue only with target-appropriate backup/restore evidence and compatible app/schema rollback or forward-fix. Take a fresh backup immediately before each subsequent change. Local D1/R2 scripts do not establish SQL Server recovery; never restore a whole database merely to undo a UI change.
