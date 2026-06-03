-- Dismiss duplicate active rows, keeping oldest per (user_id, merchant_key)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, merchant_key
      ORDER BY
        CASE WHEN is_dismissed THEN 1 ELSE 0 END,
        CASE WHEN is_confirmed THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM subscription_groups
)
UPDATE subscription_groups AS sg
SET is_dismissed = true, is_confirmed = false
FROM ranked
WHERE sg.id = ranked.id AND ranked.rn > 1 AND sg.is_dismissed = false;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_groups_user_merchant_active_idx
  ON subscription_groups (user_id, merchant_key)
  WHERE is_dismissed = false;
