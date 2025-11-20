-- ============================================================================
-- Migration 007: Multi-Provider Chatroom System
-- Purpose: Transform into 3-tier system (Chatroom → User Real Numbers → Clients)
-- Date: November 20, 2025
-- ============================================================================

-- ============================================================================
-- PART 1: API PROVIDERS TABLE
-- Store credentials for multiple messaging providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('sms', 'email', 'viber', 'whatsapp')),
  provider_name TEXT NOT NULL, -- e.g., 'Twilio', 'Base44', 'Viber Business'
  credentials JSONB NOT NULL DEFAULT '{}', -- Encrypted API keys, tokens, etc.
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- Additional configuration (webhooks, regions, etc.)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_providers_type ON api_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_api_providers_active ON api_providers(is_active);

-- RLS Policies
ALTER TABLE api_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage api_providers" ON api_providers;
CREATE POLICY "Admins can manage api_providers" ON api_providers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PART 2: UPDATE CHATROOMS TABLE
-- Add multi-provider support
-- ============================================================================

-- Add new columns to chatrooms
ALTER TABLE chatrooms 
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'twilio' 
    CHECK (provider IN ('twilio', 'base44', 'viber', 'whatsapp', 'email')),
  ADD COLUMN IF NOT EXISTS provider_account_id UUID REFERENCES api_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"sms": true}',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chatrooms_provider ON chatrooms(provider);
CREATE INDEX IF NOT EXISTS idx_chatrooms_active ON chatrooms(is_active);
CREATE INDEX IF NOT EXISTS idx_chatrooms_provider_account ON chatrooms(provider_account_id);

-- Update existing chatrooms to use 'twilio' provider
UPDATE chatrooms SET provider = 'twilio' WHERE provider IS NULL;

-- ============================================================================
-- PART 3: USER REAL NUMBERS TABLE (Mini-Chatrooms)
-- User's actual phone numbers/identifiers for sending messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_real_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  real_number TEXT NOT NULL, -- User's actual phone/email/viber ID
  provider TEXT NOT NULL CHECK (provider IN ('sms', 'viber', 'whatsapp', 'email')),
  label TEXT, -- e.g., "My Business Line", "Support Line"
  is_active BOOLEAN DEFAULT true,
  assigned_chatroom_id UUID REFERENCES chatrooms(id) ON DELETE SET NULL,
  daily_message_limit INTEGER DEFAULT 500,
  messages_sent_today INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_real_numbers_user ON user_real_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_real_numbers_chatroom ON user_real_numbers(assigned_chatroom_id);
CREATE INDEX IF NOT EXISTS idx_user_real_numbers_active ON user_real_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_real_numbers_provider ON user_real_numbers(provider);

-- Unique constraint: user can't have duplicate real number
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_real_numbers_unique 
  ON user_real_numbers(user_id, real_number, provider);

-- RLS Policies
ALTER TABLE user_real_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own real numbers" ON user_real_numbers;
DROP POLICY IF EXISTS "Users can manage own real numbers" ON user_real_numbers;
DROP POLICY IF EXISTS "Admins can manage all real numbers" ON user_real_numbers;

CREATE POLICY "Users can view own real numbers" ON user_real_numbers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own real numbers" ON user_real_numbers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all real numbers" ON user_real_numbers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PART 4: CLIENT ASSIGNMENTS TABLE
-- Links user real numbers to specific contacts/clients
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_real_number_id UUID NOT NULL REFERENCES user_real_numbers(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_assignments_real_number ON client_assignments(user_real_number_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_contact ON client_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_status ON client_assignments(status);
CREATE INDEX IF NOT EXISTS idx_client_assignments_last_message ON client_assignments(last_message_at DESC);

-- Unique constraint: contact can only be assigned once per real number
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_assignments_unique 
  ON client_assignments(user_real_number_id, contact_id);

-- RLS Policies
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assignments" ON client_assignments;
DROP POLICY IF EXISTS "Users can manage own assignments" ON client_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON client_assignments;

CREATE POLICY "Users can view own assignments" ON client_assignments
  FOR SELECT TO authenticated
  USING (
    user_real_number_id IN (
      SELECT id FROM user_real_numbers 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own assignments" ON client_assignments
  FOR ALL TO authenticated
  USING (
    user_real_number_id IN (
      SELECT id FROM user_real_numbers 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_real_number_id IN (
      SELECT id FROM user_real_numbers 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all assignments" ON client_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PART 5: UPDATE CONTACTS TABLE
-- Add import batch tracking and remove chatroom_id (replaced by assignments)
-- ============================================================================

ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS import_batch_id UUID,
  ADD COLUMN IF NOT EXISTS import_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true, -- Available in admin pool for assignment
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_batch ON contacts(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_user ON contacts(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_available ON contacts(is_available);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- Note: Keep chatroom_id for backward compatibility during transition
-- It will be phased out as users migrate to client_assignments

-- ============================================================================
-- PART 6: RESOURCE POOL TABLE
-- Admin's master database of available client numbers for assignment
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'blocked')),
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  import_batch_id UUID,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_pool_status ON resource_pool(status);
CREATE INDEX IF NOT EXISTS idx_resource_pool_assigned_user ON resource_pool(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_resource_pool_batch ON resource_pool(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_resource_pool_tags ON resource_pool USING GIN(tags);

-- RLS Policies
ALTER TABLE resource_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage resource pool" ON resource_pool;
DROP POLICY IF EXISTS "Users can view assigned resources" ON resource_pool;

CREATE POLICY "Admins can manage resource pool" ON resource_pool
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view assigned resources" ON resource_pool
  FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid());

-- ============================================================================
-- PART 7: USER QUOTAS TABLE
-- Track user limits and usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  max_real_numbers INTEGER DEFAULT 5,
  max_clients_per_number INTEGER DEFAULT 1000,
  max_messages_per_day INTEGER DEFAULT 10000,
  messages_sent_today INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_quotas_user ON user_quotas(user_id);

-- RLS Policies
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quota" ON user_quotas;
DROP POLICY IF EXISTS "Admins can manage all quotas" ON user_quotas;

CREATE POLICY "Users can view own quota" ON user_quotas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all quotas" ON user_quotas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PART 8: ADMIN ACTION LOGS
-- Track all admin actions for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'user_assigned', 'number_added', 'chatroom_created', etc.
  target_type TEXT, -- 'user', 'chatroom', 'resource', etc.
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_action_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_action_logs(created_at DESC);

-- RLS Policies
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all logs" ON admin_action_logs;

CREATE POLICY "Admins can view all logs" ON admin_action_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================================

-- Function to reset daily message counters
CREATE OR REPLACE FUNCTION reset_daily_message_counters()
RETURNS void AS $$
BEGIN
  -- Reset user quotas
  UPDATE user_quotas 
  SET 
    messages_sent_today = 0,
    quota_reset_at = NOW() + INTERVAL '1 day'
  WHERE quota_reset_at <= NOW();
  
  -- Reset real number counters
  UPDATE user_real_numbers 
  SET messages_sent_today = 0
  WHERE DATE(last_message_at) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create user quota on user creation
CREATE OR REPLACE FUNCTION auto_create_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS auto_create_user_quota_trigger ON users;
CREATE TRIGGER auto_create_user_quota_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_user_quota();

-- Function to update message counts
CREATE OR REPLACE FUNCTION update_message_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update client_assignments message count
  UPDATE client_assignments
  SET 
    message_count = message_count + 1,
    last_message_at = NOW()
  WHERE contact_id = NEW.contact_id
    AND user_real_number_id IN (
      SELECT id FROM user_real_numbers 
      WHERE user_id = NEW.user_id
    );
  
  -- Update user_real_numbers counter
  UPDATE user_real_numbers
  SET 
    messages_sent_today = messages_sent_today + 1,
    last_message_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update user quota counter
  UPDATE user_quotas
  SET messages_sent_today = messages_sent_today + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on messages table
DROP TRIGGER IF EXISTS update_message_counts_trigger ON messages;
CREATE TRIGGER update_message_counts_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_counts();

-- ============================================================================
-- PART 10: UPDATE TRIGGERS FOR TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables
DROP TRIGGER IF EXISTS update_api_providers_updated_at ON api_providers;
CREATE TRIGGER update_api_providers_updated_at
  BEFORE UPDATE ON api_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_real_numbers_updated_at ON user_real_numbers;
CREATE TRIGGER update_user_real_numbers_updated_at
  BEFORE UPDATE ON user_real_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_assignments_updated_at ON client_assignments;
CREATE TRIGGER update_client_assignments_updated_at
  BEFORE UPDATE ON client_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resource_pool_updated_at ON resource_pool;
CREATE TRIGGER update_resource_pool_updated_at
  BEFORE UPDATE ON resource_pool
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Create initial quotas for existing users
INSERT INTO user_quotas (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_quotas)
ON CONFLICT (user_id) DO NOTHING;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007 completed successfully!';
  RAISE NOTICE '📊 New tables created:';
  RAISE NOTICE '   - api_providers (multi-provider support)';
  RAISE NOTICE '   - user_real_numbers (mini-chatrooms)';
  RAISE NOTICE '   - client_assignments (contact-to-number mapping)';
  RAISE NOTICE '   - resource_pool (admin master database)';
  RAISE NOTICE '   - user_quotas (usage limits)';
  RAISE NOTICE '   - admin_action_logs (audit trail)';
  RAISE NOTICE '🔄 Updated tables:';
  RAISE NOTICE '   - chatrooms (added provider support)';
  RAISE NOTICE '   - contacts (added tags and assignment fields)';
  RAISE NOTICE '🎉 3-tier chatroom system is ready!';
END $$;
