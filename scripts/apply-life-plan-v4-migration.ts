import { config } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const statements = [
  `ALTER TABLE "life_plans" ADD COLUMN IF NOT EXISTS "is_primary" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "life_plans" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0`,
  `UPDATE "life_plans" SET "is_primary" = true WHERE "id" IN (
    SELECT DISTINCT ON ("user_id") "id" FROM "life_plans" ORDER BY "user_id", "created_at" ASC
  )`,
  `ALTER TABLE "life_plans" DROP CONSTRAINT IF EXISTS "life_plans_user_id_unique"`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "life_plans_one_primary_per_user"
    ON "life_plans" ("user_id") WHERE "is_primary" = true`,
];

async function main() {
  for (const statement of statements) {
    console.log(`Running: ${statement.slice(0, 80)}…`);
    await sql.unsafe(statement);
  }
  console.log("Done — multi-lifestyle columns are ready.");
  await sql.end({ timeout: 5 });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
