import { config } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

const statements = [
  `ALTER TABLE "life_plans" ADD COLUMN IF NOT EXISTS "zip_code" text`,
  `ALTER TABLE "life_plans" ADD COLUMN IF NOT EXISTS "household_size" integer DEFAULT 1`,
  `ALTER TABLE "tier_assumptions" ADD COLUMN IF NOT EXISTS "inflation_rate" numeric(6, 4) DEFAULT '0.0300'`,
];

async function main() {
  for (const statement of statements) {
    console.log(`Running: ${statement}`);
    await sql.unsafe(statement);
  }
  console.log("Done — life plan v2 columns are ready.");
  await sql.end({ timeout: 5 });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
