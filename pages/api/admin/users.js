import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all users first
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get all user tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('user_tokens')
        .select('*');

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
      }

      // Map tokens to users
      const users = (usersData || []).map(user => {
        const token = (tokensData || []).find(t => t.user_id === user.id);
        return {
          ...user,
          access_token: token?.access_token || null,
          is_approved: token?.is_approved ?? user.is_approved ?? false,
          token_id: token?.id || null
        };
      });

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
