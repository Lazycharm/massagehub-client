-- ============================================
-- MIGRATION 012: Add sender_number_id FK to chatrooms
-- Link chatrooms to sender_numbers properly
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting migration 012: Add sender_number_id FK to chatrooms...';
  
  -- ============================================
  -- STEP 1: Add sender_number_id column to chatrooms
  -- ============================================
  RAISE NOTICE '   Adding sender_number_id to chatrooms table...';
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chatrooms' AND column_name = 'sender_number_id'
  ) THEN
    ALTER TABLE chatrooms ADD COLUMN sender_number_id UUID REFERENCES sender_numbers(id) ON DELETE SET NULL;
    CREATE INDEX idx_chatrooms_sender_number_id ON chatrooms(sender_number_id);
    RAISE NOTICE '   ✓ Added sender_number_id column to chatrooms';
  ELSE
    RAISE NOTICE '   ℹ sender_number_id column already exists in chatrooms';
  END IF;
  
  -- ============================================
  -- STEP 2: Try to migrate existing chatrooms to link sender_numbers
  -- Match by twilio_number = sender_numbers.number_or_id
  -- ============================================
  RAISE NOTICE '   Attempting to link existing chatrooms to sender_numbers...';
  
  UPDATE chatrooms c
  SET sender_number_id = sn.id
  FROM sender_numbers sn
  WHERE c.twilio_number = sn.number_or_id
    AND c.sender_number_id IS NULL;
  
  RAISE NOTICE '   ✓ Linked existing chatrooms to sender_numbers where possible';
  
  RAISE NOTICE '✅ Migration 012 complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Chatrooms now properly linked to sender_numbers';
  RAISE NOTICE '   - chatrooms.sender_number_id → sender_numbers.id';
  RAISE NOTICE '   - twilio_number kept for backward compatibility';
  RAISE NOTICE '';
  
END $$;
