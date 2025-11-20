-- ============================================
-- Database Optimization Migration
-- Fixes RLS performance and duplicate indexes
-- ============================================

-- =============================================
-- PART 1: Fix RLS Policies (Performance Issue)
-- Replace auth.uid() with (select auth.uid())
-- Note: These will be further consolidated in Part 4
-- =============================================

-- GROUPS TABLE
DROP POLICY IF EXISTS "Admins can manage all groups" ON groups;

CREATE POLICY "Admins can manage all groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- GROUP_MEMBERS TABLE
DROP POLICY IF EXISTS "Admins can manage all group members" ON group_members;

CREATE POLICY "Admins can manage all group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- =============================================
-- PART 2: Remove Duplicate Indexes
-- =============================================

-- Drop duplicate indexes on inbound_messages
DROP INDEX IF EXISTS idx_inbound_messages_chatroom_id;
DROP INDEX IF EXISTS idx_inbound_messages_created_at;

-- Keep the shorter named ones: idx_inbound_chatroom_id, idx_inbound_created_at

-- =============================================
-- PART 3: Add Missing Indexes for Foreign Keys
-- =============================================

-- Index for user_tokens.assigned_by foreign key
CREATE INDEX IF NOT EXISTS idx_user_tokens_assigned_by 
  ON user_tokens(assigned_by);

-- Index for users.approved_by foreign key
CREATE INDEX IF NOT EXISTS idx_users_approved_by 
  ON users(approved_by);

-- =============================================
-- PART 4: Consolidate Multiple Permissive Policies
-- Combine admin + agent policies into single OR policies
-- =============================================

-- CONTACTS TABLE - Consolidate to single SELECT policy
DROP POLICY IF EXISTS "Admins can manage all contacts" ON contacts;
DROP POLICY IF EXISTS "Agents can view assigned chatroom contacts" ON contacts;

CREATE POLICY "Users can view contacts" ON contacts
  FOR SELECT USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
    OR
    -- Agents can view assigned chatroom contacts
    chatroom_id IN (
      SELECT chatroom_id 
      FROM user_chatrooms 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Admins can still INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage contacts" ON contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- MESSAGES TABLE - Consolidate to single SELECT and UPDATE policy
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Agents can view assigned chatroom messages" ON messages;
DROP POLICY IF EXISTS "Agents can update assigned chatroom messages" ON messages;

CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
    OR
    -- Agents can view assigned chatroom messages
    chatroom_id IN (
      SELECT chatroom_id 
      FROM user_chatrooms 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (
    -- Admins can update all
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
    OR
    -- Agents can update assigned chatroom messages
    chatroom_id IN (
      SELECT chatroom_id 
      FROM user_chatrooms 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Admins can INSERT/DELETE
CREATE POLICY "Admins can manage messages" ON messages
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- INBOUND_MESSAGES TABLE - Consolidate to single SELECT policy
DROP POLICY IF EXISTS "Admins can view all inbound messages" ON inbound_messages;
DROP POLICY IF EXISTS "Agents can view assigned inbound messages" ON inbound_messages;

CREATE POLICY "Users can view inbound messages" ON inbound_messages
  FOR SELECT USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
    OR
    -- Agents can view assigned chatroom messages
    chatroom_id IN (
      SELECT chatroom_id 
      FROM user_chatrooms 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- USER_CHATROOMS TABLE - Already has consolidated policies, just redefine
DROP POLICY IF EXISTS "Admins can manage all assignments" ON user_chatrooms;
DROP POLICY IF EXISTS "Users can view own assignments" ON user_chatrooms;

CREATE POLICY "Users can view chatroom assignments" ON user_chatrooms
  FOR SELECT USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
    OR
    -- Users can view own assignments
    user_id = (SELECT auth.uid())
  );

CREATE POLICY "Admins can manage chatroom assignments" ON user_chatrooms
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- SENDER_NUMBERS TABLE - Remove redundant "Anon" and "Authenticated users" policies
DROP POLICY IF EXISTS "Admins can manage sender numbers" ON sender_numbers;
DROP POLICY IF EXISTS "All users can view sender numbers" ON sender_numbers;
DROP POLICY IF EXISTS "Anon can manage sender numbers" ON sender_numbers;
DROP POLICY IF EXISTS "Authenticated users can manage" ON sender_numbers;

-- Single consolidated policy for viewing (everyone can view)
CREATE POLICY "Everyone can view sender numbers" ON sender_numbers
  FOR SELECT USING (true);

-- Only admins can manage (INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can manage sender numbers" ON sender_numbers
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- SETTINGS TABLE - Consolidate view policies
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "All users can view settings" ON settings;

-- Everyone can view settings
CREATE POLICY "Everyone can view settings" ON settings
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage settings" ON settings
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- TEMPLATES TABLE - Consolidate view policies
DROP POLICY IF EXISTS "Admins can manage all templates" ON templates;
DROP POLICY IF EXISTS "All users can view templates" ON templates;

-- Everyone can view templates
CREATE POLICY "Everyone can view templates" ON templates
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage templates" ON templates
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
      AND users.role = 'admin'
    )
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
