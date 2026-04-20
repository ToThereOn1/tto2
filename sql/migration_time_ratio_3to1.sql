-- ============================================================
-- ToThereOn Time Ratio Migration: 7:1 → 3:1
-- Run this in Supabase SQL Editor
-- Date: 2026-03-01
-- ============================================================

-- 1. Update worldview config time ratio
UPDATE admin_configs
SET config_data = jsonb_set(
    config_data,
    '{time_rules,ratio}',
    '3'
)
WHERE config_type = 'worldview_config';

-- Verify
-- SELECT config_data->'time_rules' FROM admin_configs WHERE config_type = 'worldview_config';

-- 2. Letter status column is TEXT (not enum), so new status values
-- (crossing_the_waterway, arrived_at_tothereon, reading_your_heart, writing_reply)
-- are automatically accepted. No ALTER TYPE needed.

-- 3. Update admin_checklist with delivery exception rule
UPDATE admin_configs
SET config_data = jsonb_set(
    config_data,
    '{worldview_configuration,time_engine}',
    '{"ratio": "3:1", "description": "3 days in the real world equals 1 day in ToThereOn World.", "logic": "Calculate the current_bw_day based on the pet passed_date or created_at."}'::jsonb
)
WHERE config_type = 'admin_checklist';

-- 4. Update send_letter_transaction cooldown (24h instead of 7 days)
-- This recreates the function with the corrected interval
-- Note: Run the full function definition from the latest migration file
-- The .sql migration files have been updated with INTERVAL '1 day'

-- 5. Verify changes
SELECT 'worldview_config ratio' as check_item,
       config_data->'time_rules'->>'ratio' as value
FROM admin_configs
WHERE config_type = 'worldview_config'
UNION ALL
SELECT 'checklist time_engine ratio',
       config_data->'worldview_configuration'->'time_engine'->>'ratio'
FROM admin_configs
WHERE config_type = 'admin_checklist';
