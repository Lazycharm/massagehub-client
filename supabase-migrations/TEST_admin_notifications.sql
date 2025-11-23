-- Test if admin_notifications table exists and check its structure
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_notifications'
) AS table_exists;

-- If it exists, show sample data
SELECT * FROM admin_notifications LIMIT 5;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'admin_notifications';
