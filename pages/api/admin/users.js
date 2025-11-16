import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all users with their access tokens
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_tokens (
            id,
            access_token,
            is_approved,
            is_active,
            assigned_at,
            expires_at,
            last_used_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include token info at user level
      const users = (data || []).map(user => ({
        ...user,
        access_token: user.user_tokens?.[0]?.access_token || null,
        is_approved: user.user_tokens?.[0]?.is_approved ?? user.is_approved ?? false,
        token_id: user.user_tokens?.[0]?.id || null
      }));

      return res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email, name, full_name, password } = req.body;

      // Create user with 'agent' role (database constraint requires 'admin' or 'agent')
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          email,
          name: name || full_name,
          full_name: full_name || name,
          password_hash: password ? await hashPassword(password) : null,
          role: 'agent',
          is_approved: false
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Token will be auto-created by trigger
      // Fetch the created token
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return res.status(201).json({
        ...user,
        access_token: tokenData?.access_token,
        token_id: tokenData?.id
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

// Simple password hashing (in production, use bcrypt)
async function hashPassword(password) {
  // For now, just return a placeholder
  // In production, use: const bcrypt = require('bcrypt'); return bcrypt.hash(password, 10);
  return `hashed_${password}`;
}
