-- ============================================
-- COMPLETE SCHEMA - MessageHub Current State
-- This migration represents the complete current database schema
-- ============================================

-- =============================================
-- PART 1: USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'agent'::text,
  full_name text,
  password_hash text,
  is_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['admin'::text, 'agent'::text]))
);

-- Add foreign key for approved_by after table creation
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_approved_by_fkey,
  ADD CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON public.users(approved_by);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON public.users(is_approved);

-- =============================================
-- PART 2: USER_TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 100,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  access_token text UNIQUE,
  is_approved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  CONSTRAINT user_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_tokens_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);

-- Indexes for user_tokens
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON public.user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_access_token ON public.user_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_assigned_by ON public.user_tokens(assigned_by);

-- =============================================
-- PART 3: USER_QUOTAS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_quotas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_real_numbers integer DEFAULT 5,
  max_clients_per_number integer DEFAULT 1000,
  max_messages_per_day integer DEFAULT 10000,
  messages_sent_today integer DEFAULT 0,
  quota_reset_at timestamp with time zone DEFAULT (now() + '1 day'::interval),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_quotas_pkey PRIMARY KEY (id),
  CONSTRAINT user_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for user_quotas
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON public.user_quotas(user_id);

-- =============================================
-- PART 4: API_PROVIDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.api_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_type text NOT NULL,
  provider_name text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_providers_pkey PRIMARY KEY (id),
  CONSTRAINT api_providers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT api_providers_provider_type_check CHECK (provider_type = ANY (ARRAY['sms'::text, 'email'::text, 'viber'::text, 'whatsapp'::text]))
);

-- Indexes for api_providers
CREATE INDEX IF NOT EXISTS idx_api_providers_provider_type ON public.api_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_api_providers_is_active ON public.api_providers(is_active);

-- =============================================
-- PART 5: SENDER_NUMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.sender_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone_number text UNIQUE,
  provider text DEFAULT 'twilio'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  label text,
  number_or_id text,
  type text NOT NULL DEFAULT 'phone'::text,
  region text,
  message_count integer DEFAULT 0,
  active boolean DEFAULT true,
  capabilities jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT sender_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT sender_numbers_type_check CHECK (type = ANY (ARRAY['sms'::text, 'email'::text, 'viber'::text, 'whatsapp'::text]))
);

-- Indexes for sender_numbers
CREATE INDEX IF NOT EXISTS idx_sender_numbers_provider ON public.sender_numbers(provider);
CREATE INDEX IF NOT EXISTS idx_sender_numbers_is_active ON public.sender_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_sender_numbers_type ON public.sender_numbers(type);

-- =============================================
-- PART 6: CHATROOMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.chatrooms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  sender_number text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  provider text DEFAULT 'twilio'::text,
  provider_account_id uuid,
  is_active boolean DEFAULT true,
  capabilities jsonb DEFAULT '{"sms": true}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  sender_number_id uuid,
  CONSTRAINT chatrooms_pkey PRIMARY KEY (id),
  CONSTRAINT chatrooms_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES public.api_providers(id),
  CONSTRAINT chatrooms_sender_number_id_fkey FOREIGN KEY (sender_number_id) REFERENCES public.sender_numbers(id),
  CONSTRAINT chatrooms_provider_check CHECK (provider = ANY (ARRAY['twilio'::text, 'infobip'::text, 'base44'::text, 'viber'::text, 'whatsapp'::text, 'email'::text]))
);

-- Indexes for chatrooms
CREATE INDEX IF NOT EXISTS idx_chatrooms_provider ON public.chatrooms(provider);
CREATE INDEX IF NOT EXISTS idx_chatrooms_is_active ON public.chatrooms(is_active);
CREATE INDEX IF NOT EXISTS idx_chatrooms_sender_number_id ON public.chatrooms(sender_number_id);

-- =============================================
-- PART 7: USER_CHATROOMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_chatrooms (
  user_id uuid NOT NULL,
  chatroom_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_chatrooms_pkey PRIMARY KEY (user_id, chatroom_id),
  CONSTRAINT user_chatrooms_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_chatrooms_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE CASCADE
);

-- Indexes for user_chatrooms
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_user_id ON public.user_chatrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_chatroom_id ON public.user_chatrooms(chatroom_id);

-- =============================================
-- PART 8: CONTACTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text DEFAULT 'Unknown'::text,
  phone_number text NOT NULL,
  email text,
  tags text[] DEFAULT '{}'::text[],
  chatroom_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  import_batch_id uuid,
  import_date timestamp with time zone,
  assigned_to_user_id uuid,
  is_available boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  is_favorite boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  added_via text DEFAULT 'manual'::text,
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  CONSTRAINT contacts_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id),
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT contacts_added_via_check CHECK (added_via = ANY (ARRAY['manual'::text, 'import'::text]))
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON public.contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_chatroom_id ON public.contacts(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON public.contacts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_contacts_added_via ON public.contacts(added_via);

-- =============================================
-- PART 9: MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  from_number text NOT NULL,
  to_number text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'sms'::text,
  read boolean DEFAULT false,
  chatroom_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  direction text DEFAULT 'inbound'::text,
  twilio_message_sid text,
  status text,
  contact_id uuid,
  user_id uuid,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  CONSTRAINT messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT messages_type_check CHECK (type = ANY (ARRAY['sms'::text, 'email'::text])),
  CONSTRAINT messages_direction_check CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_chatroom_id ON public.messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON public.messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_twilio_message_sid ON public.messages(twilio_message_sid);

-- =============================================
-- PART 10: INBOUND_MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.inbound_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  from_number text NOT NULL,
  chatroom_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  contact_id uuid,
  CONSTRAINT inbound_messages_pkey PRIMARY KEY (id),
  CONSTRAINT inbound_messages_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  CONSTRAINT inbound_messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);

-- Indexes for inbound_messages
CREATE INDEX IF NOT EXISTS idx_inbound_messages_chatroom_id ON public.inbound_messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_contact_id ON public.inbound_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_created_at ON public.inbound_messages(created_at DESC);

-- =============================================
-- PART 11: RESOURCE_POOL TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.resource_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  email text,
  tags text[] DEFAULT '{}'::text[],
  status text DEFAULT 'available'::text,
  assigned_to_user_id uuid,
  assigned_at timestamp with time zone,
  import_batch_id uuid,
  import_date timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resource_pool_pkey PRIMARY KEY (id),
  CONSTRAINT resource_pool_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id),
  CONSTRAINT resource_pool_status_check CHECK (status = ANY (ARRAY['available'::text, 'assigned'::text, 'blocked'::text]))
);

-- Indexes for resource_pool
CREATE INDEX IF NOT EXISTS idx_resource_pool_phone_number ON public.resource_pool(phone_number);
CREATE INDEX IF NOT EXISTS idx_resource_pool_status ON public.resource_pool(status);
CREATE INDEX IF NOT EXISTS idx_resource_pool_assigned_to_user_id ON public.resource_pool(assigned_to_user_id);

-- =============================================
-- PART 12: GROUPS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);

-- =============================================
-- PART 13: GROUP_MEMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, contact_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_members_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_contact_id ON public.group_members(contact_id);

-- =============================================
-- PART 14: TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'sms'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id),
  CONSTRAINT templates_type_check CHECK (type = ANY (ARRAY['sms'::text, 'email'::text]))
);

-- =============================================
-- PART 15: SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);

-- Index for settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

-- =============================================
-- PART 16: ADMIN_ACTION_LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_action_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(id)
);

-- Indexes for admin_action_logs
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_user_id ON public.admin_action_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON public.admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);

-- =============================================
-- PART 17: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are managed through API endpoints using supabaseAdmin
-- which bypasses RLS for authenticated server-side operations

-- =============================================
-- PART 18: FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
DROP TRIGGER IF EXISTS update_user_tokens_updated_at ON public.user_tokens;
DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON public.user_quotas;
DROP TRIGGER IF EXISTS update_api_providers_updated_at ON public.api_providers;
DROP TRIGGER IF EXISTS update_resource_pool_updated_at ON public.resource_pool;

-- Note: Only add triggers if your tables actually have updated_at columns that need auto-update

-- =============================================
-- PART 19: COMPLETION
-- =============================================

-- Grant necessary permissions (adjust as needed)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

COMMENT ON SCHEMA public IS 'MessageHub - Complete Database Schema v1.0';
