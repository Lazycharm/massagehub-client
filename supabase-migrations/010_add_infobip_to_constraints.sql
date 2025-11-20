-- ============================================================================
-- Migration 010: Add Infobip to Provider Constraints
-- Purpose: Update check constraints to allow 'infobip' as a valid provider
-- Date: November 20, 2025
-- ============================================================================

-- Drop old constraint on chatrooms table
ALTER TABLE chatrooms 
  DROP CONSTRAINT IF EXISTS chatrooms_provider_check;

-- Add new constraint that includes infobip
ALTER TABLE chatrooms 
  ADD CONSTRAINT chatrooms_provider_check 
  CHECK (provider IN ('twilio', 'infobip', 'base44', 'viber', 'whatsapp', 'email'));

-- Drop old constraint on user_real_numbers table (mini-chatrooms)
ALTER TABLE user_real_numbers 
  DROP CONSTRAINT IF EXISTS user_real_numbers_provider_check;

-- Add new constraint that includes infobip for mini-chatrooms
ALTER TABLE user_real_numbers 
  ADD CONSTRAINT user_real_numbers_provider_check 
  CHECK (provider IN ('sms', 'infobip', 'viber', 'whatsapp', 'email'));

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010 completed successfully!';
  RAISE NOTICE '   Updated chatrooms provider constraint to include Infobip';
  RAISE NOTICE '   Updated user_real_numbers (mini-chatrooms) provider constraint';
  RAISE NOTICE '   Chatrooms allowed: twilio, infobip, base44, viber, whatsapp, email';
  RAISE NOTICE '   Mini-chatrooms allowed: sms, infobip, viber, whatsapp, email';
END $$;
