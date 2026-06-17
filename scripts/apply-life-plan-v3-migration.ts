import { config } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const statements = [
  `ALTER TABLE "life_expense_categories" ADD COLUMN IF NOT EXISTS "budget_category_id" uuid REFERENCES "budget_categories"("id") ON DELETE set null`,
];

async function main() {
  for (const statement of statements) {
    console.log(`Running: ${statement}`);
    await sql.unsafe(statement);
  }
  console.log("Done — budget_category_id column is ready.");
  await sql.end({ timeout: 5 });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
