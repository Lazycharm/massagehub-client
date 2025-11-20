-- ============================================
-- MIGRATION 011: SIMPLIFY ARCHITECTURE - REMOVE MINI-CHATROOMS
-- Remove user_real_numbers table (mini-chatrooms)
-- Simplify to: Chatrooms → Users → Contacts
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting migration 011: Remove mini-chatrooms complexity...';
  
  -- ============================================
  -- STEP 1: Drop client_assignments table (depends on user_real_numbers)
  -- ============================================
  RAISE NOTICE '   Dropping client_assignments table...';
  DROP TABLE IF EXISTS client_assignments CASCADE;
  RAISE NOTICE '   ✓ Dropped client_assignments';
  
  -- ============================================
  -- STEP 2: Drop user_real_numbers table (mini-chatrooms)
  -- ============================================
  RAISE NOTICE '   Dropping user_real_numbers table...';
  DROP TABLE IF EXISTS user_real_numbers CASCADE;
  RAISE NOTICE '   ✓ Dropped user_real_numbers';
  
  -- ============================================
  -- STEP 3: Add user_id to contacts table
  -- Contacts now belong to a user within a chatroom
  -- ============================================
  RAISE NOTICE '   Adding user_id to contacts table...';
  
  DO $contacts$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE contacts ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
      CREATE INDEX idx_contacts_user_id ON contacts(user_id);
      RAISE NOTICE '   ✓ Added user_id column to contacts';
    ELSE
      RAISE NOTICE '   ℹ user_id column already exists in contacts';
    END IF;
  END $contacts$;
  
  -- ============================================
  -- STEP 4: Update contacts RLS policies
  -- Users can now manage their own contacts
  -- ============================================
  RAISE NOTICE '   Updating contacts RLS policies...';
  
  -- Drop existing policies
  DROP POLICY IF EXISTS "Admins can manage all contacts" ON contacts;
  DROP POLICY IF EXISTS "Agents can view assigned chatroom contacts" ON contacts;
  DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
  DROP POLICY IF EXISTS "Users can view chatroom contacts" ON contacts;
  
  -- Admins can manage all contacts
  CREATE POLICY "Admins can manage all contacts"
    ON contacts FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );
  
  -- Users can manage their own contacts in their assigned chatrooms
  CREATE POLICY "Users can manage own contacts"
    ON contacts FOR ALL
    USING (
      user_id = auth.uid()
      AND chatroom_id IN (
        SELECT chatroom_id FROM user_chatrooms 
        WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      user_id = auth.uid()
      AND chatroom_id IN (
        SELECT chatroom_id FROM user_chatrooms 
        WHERE user_id = auth.uid()
      )
    );
  
  -- Users can view contacts in their assigned chatrooms
  CREATE POLICY "Users can view chatroom contacts"
    ON contacts FOR SELECT
    USING (
      chatroom_id IN (
        SELECT chatroom_id FROM user_chatrooms 
        WHERE user_id = auth.uid()
      )
    );
  
  RAISE NOTICE '   ✓ Updated contacts RLS policies';
  
  -- ============================================
  -- STEP 5: Update messages table structure
  -- Messages now reference contacts directly
  -- ============================================
  RAISE NOTICE '   Updating messages table...';
  
  DO $messages$ 
  BEGIN
    -- Remove user_real_number_id if exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'user_real_number_id'
    ) THEN
      ALTER TABLE messages DROP COLUMN user_real_number_id;
      RAISE NOTICE '   ✓ Removed user_real_number_id from messages';
    END IF;
    
    -- Ensure contact_id exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'contact_id'
    ) THEN
      ALTER TABLE messages ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE;
      CREATE INDEX idx_messages_contact_id ON messages(contact_id);
      RAISE NOTICE '   ✓ Added contact_id to messages';
    ELSE
      RAISE NOTICE '   ℹ contact_id already exists in messages';
    END IF;
  END $messages$;
  
  -- ============================================
  -- STEP 6: Update inbound_messages table
  -- ============================================
  RAISE NOTICE '   Updating inbound_messages table...';
  
  DO $inbound$ 
  BEGIN
    -- Ensure contact_id exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'inbound_messages' AND column_name = 'contact_id'
    ) THEN
      ALTER TABLE inbound_messages ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
      CREATE INDEX idx_inbound_messages_contact_id ON inbound_messages(contact_id);
      RAISE NOTICE '   ✓ Added contact_id to inbound_messages';
    ELSE
      RAISE NOTICE '   ℹ contact_id already exists in inbound_messages';
    END IF;
  END $inbound$;
  
  RAISE NOTICE '✅ Migration 011 complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New simplified architecture:';
  RAISE NOTICE '   1. Admin creates chatrooms (with provider + sender_number)';
  RAISE NOTICE '   2. Admin assigns users to chatrooms (user_chatrooms)';
  RAISE NOTICE '   3. Admin assigns resources to users (resource_pool)';
  RAISE NOTICE '   4. User imports resources → Creates contacts in chatroom';
  RAISE NOTICE '   5. User chats with contacts through chatroom';
  RAISE NOTICE '';
  
END $$;
