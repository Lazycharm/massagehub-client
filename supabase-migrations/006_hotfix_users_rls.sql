-- ============================================
-- HOTFIX: Fix Infinite Recursion in Users Table RLS
-- Run this immediately if signup is failing
-- ============================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- Refresh schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- NOTES:
-- - Admin operations now use supabaseAdmin client (bypasses RLS)
-- - No more recursive policy checks
-- - User signup will now work!
-- ============================================
