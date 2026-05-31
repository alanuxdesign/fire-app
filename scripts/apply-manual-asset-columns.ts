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
  `ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "asset_class_override" text`,
  `ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "market_symbol" text`,
  `ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "market_quantity" numeric(19, 4)`,
];

async function main() {
  for (const statement of statements) {
    console.log(`Running: ${statement}`);
    await sql.unsafe(statement);
  }

  console.log("Done — manual_assets columns are ready.");
  await sql.end({ timeout: 5 });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
