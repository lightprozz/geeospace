# Local D1 and R2 backup and restore

Scope: logical snapshots of the local DB and LEARNING_FILES bucket. This does not access remote Cloudflare or replace production D1 Time Travel/R2 recovery or SQL Server backups. There is no business schema/user data yet.

Stop workspace writers/dev/preview before snapshots, respecting process ownership. `--writers-stopped` is an operator attestation; the script cannot prove external writers stopped. D1/R2 share no transaction. Snapshots contain private content, use mode 0600, never overwrite, and belong in safe private storage outside Git.

```sh
npm run backup:local -- /private/tmp/geeospace-backup.json --writers-stopped
npm run restore:local -- /private/tmp/geeospace-backup.json /private/tmp/geeospace-restored-new
```

Backup reads `.wrangler/state`. Restore requires a new nonexistent directory outside active state, including through symlinked parents; scripts resolve physical paths. Checksums reject corruption before writing. Verify schema, order-independent record sets, and object bodies afterward.

The new destination records `restore-status.json`: `in-progress`, then `verified`. Partial DB/R2 failure marks `failed`, renames the new area with `.failed-<timestamp>`, and reports quarantine. Never activate quarantined data; preserve snapshot/source for investigation. Scripts do not delete or rename pre-existing user destinations.

Intentional fail-closed limits: 16 MiB payload, no virtual/FTS tables, no unsafe-range integers, no extended R2 HTTP metadata beyond contentType, and no snapshots with active writers. Custom metadata and file bodies are preserved. If business data exceeds these limits, establish and test a suitable recovery route before migration. This script alone does not meet production recovery requirements.

`npm run test:integration` uses real local D1/R2: backup empty state before the fixture schema, test unique constraints/batch rollback/CAS, snapshot DB/files, reject corruption, restore into isolation, and compare data/checksums. Fixtures are test-only and temporary areas are removed after execution.
