import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Load .env.local before any module that imports lib/db.ts.
 * Call at the top of CLI scripts (before other @/ imports).
 */
export function loadEnvLocal(): void {
  config({ path: resolve(process.cwd(), ".env.local") });
}

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set. Add it to .env.local in the project root.",
    );
    process.exit(1);
  }
  return url;
}
