import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

// Only check service role key on server-side (it should never be in the browser)
if (typeof window === 'undefined') {
  if (!supabaseServiceKey) {
    console.error('⚠️  SUPABASE_SERVICE_ROLE_KEY is MISSING! Admin operations will fail!');
  } else {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY loaded (length:', supabaseServiceKey.length, ')');
  }
}

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (can bypass RLS, create auth users, etc.)
// Only create this on the server-side to avoid exposing the service role key
let supabaseAdminInstance = null;

if (typeof window === 'undefined' && supabaseServiceKey) {
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const supabaseAdmin = supabaseAdminInstance;