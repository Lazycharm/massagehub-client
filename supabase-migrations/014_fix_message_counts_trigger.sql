-- ============================================
-- MIGRATION 014: Fix update_message_counts trigger
-- Remove references to deleted client_assignments table
-- Update to work with simplified architecture
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting migration 014: Fix message counts trigger...';
  
  -- Drop the old trigger first
  DROP TRIGGER IF EXISTS update_message_counts_trigger ON messages;
  RAISE NOTICE '   ✓ Dropped old trigger';
  
  -- Replace the function with simplified version
  CREATE OR REPLACE FUNCTION update_message_counts()
  RETURNS TRIGGER AS $func$
  BEGIN
    -- Update user quota counter (if user_id is set)
    IF NEW.user_id IS NOT NULL THEN
      UPDATE user_quotas
      SET messages_sent_today = messages_sent_today + 1
      WHERE user_id = NEW.user_id;
      
      RAISE NOTICE '   ✓ Updated user_quotas for user: %', NEW.user_id;
    END IF;
    
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;
  
  RAISE NOTICE '   ✓ Created new update_message_counts function';
  
  -- Recreate the trigger
  CREATE TRIGGER update_message_counts_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_counts();
  
  RAISE NOTICE '   ✓ Recreated trigger on messages table';
  RAISE NOTICE '✅ Migration 014 complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   - Removed client_assignments and user_real_numbers references';
  RAISE NOTICE '   - Simplified to only update user_quotas table';
  RAISE NOTICE '   - Messages can now be stored without client_assignments table';
  
END $$;
