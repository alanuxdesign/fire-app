ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "duplicate_of_transaction_id" uuid;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "has_splits" boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_duplicate_of_transaction_id_transactions_id_fk"
    FOREIGN KEY ("duplicate_of_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "transaction_splits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "amount" numeric(19, 4) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "transaction_splits"
    ADD CONSTRAINT "transaction_splits_transaction_id_transactions_id_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction_splits"
    ADD CONSTRAINT "transaction_splits_category_id_budget_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_transaction_splits_txn" ON "transaction_splits" ("transaction_id");

CREATE TABLE IF NOT EXISTS "recurring_bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "merchant_key" text,
  "expected_amount" numeric(19, 4) NOT NULL,
  "cadence" text DEFAULT 'monthly' NOT NULL,
  "next_due_date" date NOT NULL,
  "category_id" uuid,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "recurring_bills"
    ADD CONSTRAINT "recurring_bills_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recurring_bills"
    ADD CONSTRAINT "recurring_bills_category_id_budget_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_recurring_bills_user_due" ON "recurring_bills" ("user_id", "next_due_date");

CREATE TABLE IF NOT EXISTS "saved_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "saved_reports"
    ADD CONSTRAINT "saved_reports_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
