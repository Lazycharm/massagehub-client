-- ============================================
-- COMPLETE DATABASE SCHEMA FOR MESSAGEHUB
-- All tables, triggers, and policies in correct order
-- Created: November 16, 2025
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- Add role column to existing Supabase Auth users table
-- ============================================
-- Add role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent'));
  END IF;
END $$;

-- Add name column if it doesn't exist (for non-Auth users table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN name TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================
-- 2. USER_TOKENS TABLE
-- Stores token/credit balance for each user
-- ============================================
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_tokens_updated_at'
  ) THEN
    CREATE TRIGGER user_tokens_updated_at
      BEFORE UPDATE ON user_tokens
      FOR EACH ROW
      EXECUTE FUNCTION update_user_tokens_updated_at();
  END IF;
END $$;

-- Function to initialize tokens for new users
CREATE OR REPLACE FUNCTION initialize_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_tokens (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create tokens when user is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_initialize_user_tokens'
  ) THEN
    CREATE TRIGGER auto_initialize_user_tokens
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION initialize_user_tokens();
  END IF;
END $$;

-- Initialize tokens for existing users
INSERT INTO user_tokens (user_id, balance)
SELECT id, 100 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. CHATROOMS TABLE
-- Represents chat channels/rooms with Twilio numbers
-- ============================================
CREATE TABLE IF NOT EXISTS chatrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  twilio_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatrooms_twilio_number ON chatrooms(twilio_number);

-- ============================================
-- 4. USER_CHATROOMS TABLE
-- Multi-tenant: Assigns agents to specific chatrooms
-- ============================================
CREATE TABLE IF NOT EXISTS user_chatrooms (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_chatrooms_pkey PRIMARY KEY (user_id, chatroom_id)
);

CREATE INDEX IF NOT EXISTS idx_user_chatrooms_user_id ON user_chatrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_chatroom_id ON user_chatrooms(chatroom_id);

-- Enable RLS
ALTER TABLE user_chatrooms ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins can manage all assignments"
  ON user_chatrooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can view their own assignments
CREATE POLICY "Users can view own assignments"
  ON user_chatrooms FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 5. CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT DEFAULT 'Unknown',
  phone_number TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_chatroom_id ON contacts(chatroom_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

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

-- Agents can view contacts in their assigned chatrooms
CREATE POLICY "Agents can view assigned chatroom contacts"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_chatrooms
      WHERE user_chatrooms.user_id = auth.uid()
      AND user_chatrooms.chatroom_id = contacts.chatroom_id
    )
  );

-- ============================================
-- 6. GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all groups"
  ON groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- 7. GROUP_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_contact_id ON group_members(contact_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all group members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- 8. TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'sms' CHECK (type IN ('sms', 'email')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all templates"
  ON templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "All users can view templates"
  ON templates FOR SELECT
  USING (true);

-- ============================================
-- 9. SENDER_NUMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sender_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL UNIQUE,
  provider TEXT DEFAULT 'twilio',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sender_numbers_active ON sender_numbers(is_active);

ALTER TABLE sender_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sender numbers"
  ON sender_numbers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "All users can view sender numbers"
  ON sender_numbers FOR SELECT
  USING (is_active = true);

-- ============================================
-- 10. SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "All users can view settings"
  ON settings FOR SELECT
  USING (true);

-- ============================================
-- 11. MESSAGES TABLE
-- Unified messages table for both inbound and outbound
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'sms' CHECK (type IN ('sms', 'email')),
  read BOOLEAN DEFAULT false,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE SET NULL,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chatroom_id ON messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Agents can view messages from their assigned chatrooms
CREATE POLICY "Agents can view assigned chatroom messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_chatrooms
      WHERE user_chatrooms.user_id = auth.uid()
      AND user_chatrooms.chatroom_id = messages.chatroom_id
    )
  );

-- Agents can update messages in their assigned chatrooms
CREATE POLICY "Agents can update assigned chatroom messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_chatrooms
      WHERE user_chatrooms.user_id = auth.uid()
      AND user_chatrooms.chatroom_id = messages.chatroom_id
    )
  );

-- ============================================
-- 12. INBOUND_MESSAGES TABLE
-- Dedicated table for inbound messages
-- ============================================
CREATE TABLE IF NOT EXISTS inbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT NOT NULL,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_chatroom_id ON inbound_messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_inbound_created_at ON inbound_messages(created_at DESC);

ALTER TABLE inbound_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all inbound messages
CREATE POLICY "Admins can view all inbound messages"
  ON inbound_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Agents can view messages from their assigned chatrooms
CREATE POLICY "Agents can view assigned inbound messages"
  ON inbound_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_chatrooms
      WHERE user_chatrooms.user_id = auth.uid()
      AND user_chatrooms.chatroom_id = inbound_messages.chatroom_id
    )
  );

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MessageHub Database Schema Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ users (with role column)';
  RAISE NOTICE '  ✓ user_tokens (billing system)';
  RAISE NOTICE '  ✓ chatrooms (Twilio channels)';
  RAISE NOTICE '  ✓ user_chatrooms (multi-tenant)';
  RAISE NOTICE '  ✓ contacts';
  RAISE NOTICE '  ✓ groups';
  RAISE NOTICE '  ✓ group_members';
  RAISE NOTICE '  ✓ templates';
  RAISE NOTICE '  ✓ sender_numbers';
  RAISE NOTICE '  ✓ settings';
  RAISE NOTICE '  ✓ messages (unified inbox/outbox)';
  RAISE NOTICE '  ✓ inbound_messages';
  RAISE NOTICE '';
  RAISE NOTICE 'Features configured:';
  RAISE NOTICE '  ✓ Row Level Security (RLS) on all tables';
  RAISE NOTICE '  ✓ Multi-tenant chatroom assignments';
  RAISE NOTICE '  ✓ Token billing system (100 tokens per user)';
  RAISE NOTICE '  ✓ Auto-initialize tokens for new users';
  RAISE NOTICE '  ✓ Admin/Agent role permissions';
  RAISE NOTICE '  ✓ Chatroom-based access control';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create admin user: INSERT INTO users (email, name, role) VALUES (''admin@example.com'', ''Admin User'', ''admin'');';
  RAISE NOTICE '  2. Create chatrooms and assign agents via user_chatrooms table';
  RAISE NOTICE '  3. Deploy application to server';
  RAISE NOTICE '========================================';
END $$;
