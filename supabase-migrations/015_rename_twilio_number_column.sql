-- ============================================
-- MIGRATION 015: Rename twilio_number to sender_number
-- Make column name provider-agnostic
-- Clean up spaces in phone numbers
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting migration 015: Rename twilio_number column...';
  
  -- Check if twilio_number column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatrooms' AND column_name = 'twilio_number'
  ) THEN
    -- Clean up spaces in phone numbers first
    UPDATE chatrooms 
    SET twilio_number = REPLACE(twilio_number, ' ', '')
    WHERE twilio_number LIKE '% %';
    
    RAISE NOTICE '   ✓ Cleaned up spaces in phone numbers';
    
    -- Rename the column
    ALTER TABLE chatrooms RENAME COLUMN twilio_number TO sender_number;
    RAISE NOTICE '   ✓ Renamed twilio_number to sender_number';
    
    -- Rename the index
    ALTER INDEX IF EXISTS idx_chatrooms_twilio_number RENAME TO idx_chatrooms_sender_number;
    RAISE NOTICE '   ✓ Renamed index';
    
  ELSE
    RAISE NOTICE '   ℹ Column already renamed or does not exist';
  END IF;
  
  RAISE NOTICE '✅ Migration 015 complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   - Removed spaces from phone numbers (e.g., "+44 7860 043791" → "+447860043791")';
  RAISE NOTICE '   - Renamed twilio_number → sender_number (provider-agnostic)';
  RAISE NOTICE '   - Updated index name to match';
  
END $$;
