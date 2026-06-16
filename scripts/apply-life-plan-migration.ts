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
  `DO $$ BEGIN
    CREATE TYPE "account_accessibility" AS ENUM ('immediate', 'reachable', 'locked');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE "milestone_type" AS ENUM ('category', 'tier');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE "contingency_scenario" AS ENUM ('job_loss', 'big_expense', 'downturn');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE "financial_accounts" ADD COLUMN IF NOT EXISTS "accessibility" "account_accessibility"`,
  `ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "accessibility" "account_accessibility"`,
  `CREATE TABLE IF NOT EXISTS "life_plans" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
    "label" text NOT NULL,
    "swr" numeric(6, 4) DEFAULT '0.0400' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "life_phases" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "life_plan_id" uuid NOT NULL REFERENCES "life_plans"("id") ON DELETE cascade,
    "label" text NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "life_expense_categories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "life_plan_id" uuid NOT NULL REFERENCES "life_plans"("id") ON DELETE cascade,
    "label" text NOT NULL,
    "annual_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
    "is_essential" boolean DEFAULT true NOT NULL,
    "phase_id" uuid REFERENCES "life_phases"("id") ON DELETE set null,
    "sort_order" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "tier_assumptions" (
    "life_plan_id" uuid PRIMARY KEY REFERENCES "life_plans"("id") ON DELETE cascade,
    "swr" numeric(6, 4) DEFAULT '0.0400' NOT NULL,
    "expected_return" numeric(6, 4) DEFAULT '0.0700' NOT NULL,
    "target_year" integer,
    "part_time_income" numeric(19, 4) DEFAULT '12000' NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "milestone_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "life_plan_id" uuid NOT NULL REFERENCES "life_plans"("id") ON DELETE cascade,
    "type" "milestone_type" NOT NULL,
    "ref" text NOT NULL,
    "secured_at" timestamp DEFAULT now() NOT NULL,
    "buffer_clear_at" timestamp
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "milestone_events_plan_type_ref_idx"
    ON "milestone_events" ("life_plan_id", "type", "ref")`,
  `CREATE TABLE IF NOT EXISTS "contingency_plans" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "life_plan_id" uuid NOT NULL REFERENCES "life_plans"("id") ON DELETE cascade,
    "scenario" "contingency_scenario" NOT NULL,
    "levers" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "saved_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "contingency_plans_plan_scenario_idx"
    ON "contingency_plans" ("life_plan_id", "scenario")`,
];

async function main() {
  for (const statement of statements) {
    console.log(`Running: ${statement.slice(0, 80)}…`);
    await sql.unsafe(statement);
  }

  console.log("Done — life plan tables are ready.");
  await sql.end({ timeout: 5 });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
