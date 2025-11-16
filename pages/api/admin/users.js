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

      // Generate access token manually (8 characters)
      const accessToken = generateAccessToken();

      // Create token manually
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_tokens')
        .insert([{
          user_id: user.id,
          access_token: accessToken,
          is_approved: false,
          is_active: true
        }])
        .select()
        .single();

      if (tokenError) {
        console.error('Error creating token:', tokenError);
        // Don't fail signup if token creation fails
      }

      return res.status(201).json({
        ...user,
        access_token: tokenData?.access_token || accessToken,
        token_id: tokenData?.id || null
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

// Generate 8-character access token
function generateAccessToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Simple password hashing (in production, use bcrypt)
async function hashPassword(password) {
  // For now, just return a placeholder
  // In production, use: const bcrypt = require('bcrypt'); return bcrypt.hash(password, 10);
  return `hashed_${password}`;
}
