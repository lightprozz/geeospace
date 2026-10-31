import { createHash } from "node:crypto";

type Value = string | number | null | { blob: number[] };
type Table = { name: string; sql: string; columns: string[]; rows: Value[][] };
type StoredObject = { key: string; body: string; contentType?: string; customMetadata?: Record<string, string> };
export type LocalSnapshot = { version: 1; createdAt: string; tables: Table[]; extraSchema: string[]; objects: StoredObject[] };
export type SnapshotEnvelope = { checksum: string; payload: LocalSnapshot };
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const maxBytes = 16 * 1024 * 1024;

function encodeValue(value: unknown): Value {
  if (value === null || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))) return value;
  if (value instanceof ArrayBuffer) return { blob: Array.from(new Uint8Array(value)) };
  if (ArrayBuffer.isView(value)) return { blob: Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  if (Array.isArray(value) && value.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) return { blob: value };
  throw new Error("Unsupported database value; backup stopped without writing an incomplete snapshot");
}

function digest(payload: LocalSnapshot) {
  const normalized = {
    ...payload,
    tables: payload.tables.map((table) => ({ ...table, rows: [...table.rows].sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0) })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    extraSchema: [...payload.extraSchema].sort(),
    objects: [...payload.objects].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  };
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
    return value;
  };
  return createHash("sha256").update(JSON.stringify(canonical(normalized))).digest("hex");
}

/** Local, bounded logical snapshot. All writers must be stopped before invoking it. */
export async function captureLocalSnapshot(db: D1Database, bucket: R2Bucket): Promise<SnapshotEnvelope> {
  const schema = await db.prepare("SELECT name, type, sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY type, name").all<{ name: string; type: string; sql: string }>();
  const tables: Table[] = [];
  for (const entry of schema.results.filter((entry) => entry.type === "table")) {
    if (/\bVIRTUAL\s+TABLE\b/i.test(entry.sql)) throw new Error("Virtual-table backups require a dedicated recovery route");
    const info = await db.prepare(`PRAGMA table_info(${quote(entry.name)})`).all<{ name: string }>();
    const columns = info.results.map((column) => column.name);
    const rows = await db.prepare(`SELECT ${columns.map(quote).join(",")} FROM ${quote(entry.name)}`).all<Record<string, unknown>>();
    tables.push({ name: entry.name, sql: entry.sql, columns, rows: rows.results.map((row) => columns.map((column) => encodeValue(row[column]))) });
  }
  const objects: StoredObject[] = [];
  let cursor: string | undefined;
  let objectBytes = 0;
  do {
    const page = await bucket.list({ cursor });
    for (const item of page.objects) {
      objectBytes += item.size;
      if (objectBytes > maxBytes) throw new Error("Local snapshot limit exceeded");
      const object = await bucket.get(item.key);
      if (!object) throw new Error("Object changed during backup; stop all writers and retry");
      const metadata = object.httpMetadata;
      if (metadata?.contentDisposition || metadata?.contentEncoding || metadata?.contentLanguage || metadata?.cacheControl || metadata?.cacheExpiry) {
        throw new Error("Extended object metadata requires a dedicated recovery route");
      }
      objects.push({ key: item.key, body: Buffer.from(await object.arrayBuffer()).toString("base64"), contentType: metadata?.contentType, customMetadata: object.customMetadata });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const payload: LocalSnapshot = { version: 1, createdAt: new Date().toISOString(), tables, extraSchema: schema.results.filter((entry) => entry.type !== "table").map((entry) => entry.sql), objects };
  if (Buffer.byteLength(JSON.stringify(payload)) > maxBytes) throw new Error("Local snapshot limit exceeded");
  return { checksum: digest(payload), payload };
}

export function verifySnapshot(input: unknown): SnapshotEnvelope {
  if (!input || typeof input !== "object") throw new Error("Invalid snapshot");
  const envelope = input as SnapshotEnvelope;
  if (envelope.payload?.version !== 1 || !Array.isArray(envelope.payload.tables) || !Array.isArray(envelope.payload.objects) || !Array.isArray(envelope.payload.extraSchema) || envelope.checksum !== digest(envelope.payload)) {
    throw new Error("Snapshot checksum or version invalid");
  }
  return envelope;
}

/** Never restores over existing data. A failed restore target must be discarded. */
export async function restoreLocalSnapshot(db: D1Database, bucket: R2Bucket, input: unknown) {
  const { payload } = verifySnapshot(input);
  const existing = await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'").all();
  if (existing.results.length || (await bucket.list({ limit: 1 })).objects.length) throw new Error("Restore destination must be empty");
  const statements = [db.prepare("PRAGMA defer_foreign_keys = ON")];
  for (const table of payload.tables) statements.push(db.prepare(table.sql));
  for (const table of payload.tables) {
    for (const row of table.rows) {
      const values = row.map((v) => v && typeof v === "object" ? new Uint8Array(v.blob) : v);
      statements.push(db.prepare(`INSERT INTO ${quote(table.name)} (${table.columns.map(quote).join(",")}) VALUES (${row.map(() => "?").join(",")})`).bind(...values));
    }
  }
  for (const sql of payload.extraSchema) statements.push(db.prepare(sql));
  statements.push(db.prepare("PRAGMA defer_foreign_keys = OFF"));
  await db.batch(statements);
  for (const object of payload.objects) {
    await bucket.put(object.key, Buffer.from(object.body, "base64"), { httpMetadata: { contentType: object.contentType }, customMetadata: object.customMetadata });
  }
  const recovered = await captureLocalSnapshot(db, bucket);
  const expected = { ...payload, createdAt: recovered.payload.createdAt };
  if (digest(expected) !== recovered.checksum) throw new Error("Restore verification failed; do not use this destination");
  return { tables: payload.tables.length, objects: payload.objects.length };
}
