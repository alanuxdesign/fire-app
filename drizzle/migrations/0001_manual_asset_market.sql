ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "asset_class_override" text;
ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "market_symbol" text;
ALTER TABLE "manual_assets" ADD COLUMN IF NOT EXISTS "market_quantity" numeric(19, 4);
