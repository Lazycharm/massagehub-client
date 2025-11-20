-- ============================================================================
-- Migration: Add Infobip Provider
-- Purpose: Insert Infobip SMS provider with credentials
-- Date: November 20, 2025
-- ============================================================================

-- Insert Infobip provider
INSERT INTO api_providers (
  provider_type,
  provider_name,
  credentials,
  config,
  is_active,
  created_at,
  updated_at
) VALUES (
  'sms',
  'Infobip',
  jsonb_build_object(
    'apiKey', '7024f97779c5fae4c85c491bd91c2ed1-28a6aae6-65f7-4a7b-989b-c7457456baa8',
    'baseUrl', 'https://d9qeqv.api.infobip.com'
  ),
  jsonb_build_object(
    'description', 'Infobip SMS Provider',
    'features', jsonb_build_array('sms', 'alphanumeric_sender', 'delivery_reports')
  ),
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Display confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Infobip provider added successfully!';
  RAISE NOTICE '   Provider Type: sms';
  RAISE NOTICE '   Provider Name: Infobip';
  RAISE NOTICE '   Base URL: https://d9qeqv.api.infobip.com';
  RAISE NOTICE '   Status: Active';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to Admin → Providers to verify';
  RAISE NOTICE '2. Test connection to check credentials';
  RAISE NOTICE '3. Add sender numbers in Admin → Sender Numbers';
  RAISE NOTICE '4. Link to chatrooms and start sending!';
END $$;
