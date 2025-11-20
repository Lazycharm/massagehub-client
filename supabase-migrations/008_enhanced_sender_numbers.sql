-- ============================================================================
-- Migration 008: Enhanced Sender Numbers
-- Purpose: Add fields for multi-provider support and better management
-- Date: November 20, 2025
-- ============================================================================

-- Add new columns to sender_numbers table
ALTER TABLE sender_numbers 
  ADD COLUMN IF NOT EXISTS number_or_id TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Drop old type constraint if exists (from migration 005)
ALTER TABLE sender_numbers 
  DROP CONSTRAINT IF EXISTS sender_numbers_type_check;

-- Add type column if not exists (without constraint first)
ALTER TABLE sender_numbers 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sms';

-- Update existing rows to use valid type values
-- Map old values to new ones: 'phone' -> 'sms', 'alphanumeric' -> 'sms'
UPDATE sender_numbers 
SET type = CASE 
  WHEN type IN ('phone', 'alphanumeric') THEN 'sms'
  WHEN type NOT IN ('sms', 'email', 'viber', 'whatsapp') THEN 'sms'
  ELSE type
END
WHERE type IS NOT NULL;

-- Add the new type constraint
ALTER TABLE sender_numbers 
  ADD CONSTRAINT sender_numbers_type_check CHECK (type IN ('sms', 'email', 'viber', 'whatsapp'));

-- Migrate existing data: copy phone_number to number_or_id
UPDATE sender_numbers 
SET number_or_id = phone_number, 
    label = phone_number,
    active = is_active
WHERE number_or_id IS NULL;

-- Create unique index on number_or_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_sender_numbers_number_or_id 
  ON sender_numbers(number_or_id);

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_sender_numbers_type ON sender_numbers(type);
CREATE INDEX IF NOT EXISTS idx_sender_numbers_provider ON sender_numbers(provider);
CREATE INDEX IF NOT EXISTS idx_sender_numbers_region ON sender_numbers(region);

-- Update RLS policies (keep existing policies, they already cover admin access)

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008 completed successfully!';
  RAISE NOTICE '📊 Enhanced sender_numbers table with:';
  RAISE NOTICE '   - Multi-provider support fields';
  RAISE NOTICE '   - Type column (sms, email, viber, whatsapp)';
  RAISE NOTICE '   - Message count tracking';
  RAISE NOTICE '   - Capabilities metadata';
END $$;
