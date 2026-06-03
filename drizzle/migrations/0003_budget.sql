ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "transactions_cursor" text;
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "last_transactions_sync_at" timestamp;

ALTER TABLE "financial_accounts" ADD COLUMN IF NOT EXISTS "exclude_from_budget" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "budget_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE cascade,
  "slug" text NOT NULL,
  "label" text NOT NULL,
  "icon" text NOT NULL DEFAULT 'CircleDollarSign',
  "is_system" boolean DEFAULT false NOT NULL,
  "is_income" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "rollover_enabled" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "budget_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "color" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "budget_targets" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "category_id" uuid NOT NULL REFERENCES "budget_categories"("id") ON DELETE cascade,
  "month" text NOT NULL,
  "amount" numeric(19, 4) NOT NULL,
  PRIMARY KEY ("user_id", "category_id", "month")
);

CREATE TABLE IF NOT EXISTS "merchant_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "merchant_key" text NOT NULL,
  "display_name" text,
  "default_category_id" uuid REFERENCES "budget_categories"("id") ON DELETE set null,
  "default_tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "requires_review" boolean DEFAULT false NOT NULL,
  "apply_to_future" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_rules_user_merchant" ON "merchant_rules" ("user_id", "merchant_key");

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "financial_account_id" uuid NOT NULL REFERENCES "financial_accounts"("id") ON DELETE cascade,
  "plaid_transaction_id" text NOT NULL,
  "plaid_account_id" text NOT NULL,
  "date" date NOT NULL,
  "authorized_date" date,
  "amount" numeric(19, 4) NOT NULL,
  "name" text NOT NULL,
  "merchant_name" text,
  "pending" boolean DEFAULT false NOT NULL,
  "payment_channel" text,
  "plaid_category" jsonb,
  "primary_category" text,
  "detailed_category" text,
  "user_category_id" uuid REFERENCES "budget_categories"("id") ON DELETE set null,
  "include_in_budget" boolean DEFAULT true NOT NULL,
  "note" text,
  "is_transfer" boolean DEFAULT false NOT NULL,
  "review_status" text,
  "reviewed_at" timestamp,
  "subscription_group_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_plaid_txn_id" ON "transactions" ("plaid_transaction_id");
CREATE INDEX IF NOT EXISTS "transactions_user_date" ON "transactions" ("user_id", "date" DESC);
CREATE INDEX IF NOT EXISTS "transactions_user_review" ON "transactions" ("user_id", "review_status");

CREATE TABLE IF NOT EXISTS "transaction_tags" (
  "transaction_id" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
  "tag_id" uuid NOT NULL REFERENCES "budget_tags"("id") ON DELETE cascade,
  PRIMARY KEY ("transaction_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "budget_user_settings" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "include_pending_in_budget" boolean DEFAULT false NOT NULL,
  "monthly_budget_total" numeric(19, 4),
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscription_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "merchant_key" text NOT NULL,
  "display_name" text NOT NULL,
  "expected_amount" numeric(19, 4) NOT NULL,
  "cadence" text NOT NULL,
  "next_expected_date" date,
  "category_id" uuid REFERENCES "budget_categories"("id") ON DELETE set null,
  "is_confirmed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
