CREATE TABLE IF NOT EXISTS "budget_category_prefs" (
  "user_id" text NOT NULL,
  "category_id" uuid NOT NULL,
  "rollover_enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "budget_category_prefs_user_id_category_id_pk" PRIMARY KEY ("user_id", "category_id")
);

DO $$ BEGIN
  ALTER TABLE "budget_category_prefs"
    ADD CONSTRAINT "budget_category_prefs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "budget_category_prefs"
    ADD CONSTRAINT "budget_category_prefs_category_id_budget_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
