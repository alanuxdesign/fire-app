import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL);

  const migrationPath = resolve(
    process.cwd(),
    "drizzle/migrations/0006_budget_v2.sql",
  );
  const migrationSql = readFileSync(migrationPath, "utf8");

  await sql.unsafe(migrationSql);

  console.log("Applied budget v2 migration (0006_budget_v2.sql)");
  await sql.end();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
