import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL);

  await sql`
    ALTER TABLE "financial_accounts"
    ADD COLUMN IF NOT EXISTS "display_name" text
  `;

  console.log("Added financial_accounts.display_name if missing");
  await sql.end();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
