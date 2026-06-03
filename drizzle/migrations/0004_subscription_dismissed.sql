ALTER TABLE "subscription_groups" ADD COLUMN IF NOT EXISTS "is_dismissed" boolean DEFAULT false NOT NULL;
