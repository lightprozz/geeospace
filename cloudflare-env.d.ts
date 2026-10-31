/// <reference types="@cloudflare/workers-types" />
interface CloudflareEnv {
  DB: D1Database;
  LEARNING_FILES: R2Bucket;
  APP_ENV: string;
  APP_ORIGIN: string;
}
