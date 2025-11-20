-- ============================================
-- MIGRATION 013: Add user_id to messages table
-- Track which user sent each message
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting migration 013: Add user_id to messages...';
  
  -- Add user_id column to messages table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX idx_messages_user_id ON messages(user_id);
    RAISE NOTICE '   ✓ Added user_id column to messages';
  ELSE
    RAISE NOTICE '   ℹ user_id column already exists in messages';
  END IF;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
  DROP POLICY IF EXISTS "Users can view their chatroom messages" ON messages;
  
  -- Create RLS policies for messages with user_id
  CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    WITH CHECK (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    );
  
  CREATE POLICY "Users can view their chatroom messages"
    ON messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
      ) OR
      EXISTS (
        SELECT 1 FROM user_chatrooms 
        WHERE user_chatrooms.user_id = auth.uid() 
        AND user_chatrooms.chatroom_id = messages.chatroom_id
      ) OR
      auth.uid() = messages.user_id
    );
  
  RAISE NOTICE '   ✓ Added RLS policies for messages';
  RAISE NOTICE '✅ Migration 013 complete!';
  
END $$;
