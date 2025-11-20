import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Use supabaseAdmin to bypass RLS for admin operations
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get all user tokens
      const { data: tokensData, error: tokensError } = await supabaseAdmin
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

      // 1. Create user in Supabase Auth using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: full_name || name,
          name: name || full_name
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      const userId = authData.user.id;
      console.log('Created auth user:', userId, email);

      // 2. Create user record in public.users using supabaseAdmin
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId, // Use same ID as auth user
          email,
          name: name || full_name,
          full_name: full_name || name,
          role: 'agent',
          is_approved: false
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user record:', userError);
        // Rollback: delete auth user if database insert fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw userError;
      }

      console.log('Created user record:', user);

      // 3. Generate access token manually (8 characters)
      const accessToken = generateAccessToken();

      // 4. Create token - Check if already exists first using supabaseAdmin
      const { data: existingToken } = await supabaseAdmin
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      let tokenData;
      if (existingToken) {
        console.log('Token already exists for user:', userId);
        tokenData = existingToken;
      } else {
        const { data: newToken, error: tokenError } = await supabaseAdmin
          .from('user_tokens')
          .insert({
            user_id: userId,
            access_token: accessToken,
            is_approved: false,
            is_active: true
          })
          .select()
          .single();

        if (tokenError) {
          console.error('Error creating token:', tokenError);
          // Don't rollback for token error - user is already created
        } else {
          console.log('Created token:', newToken);
          tokenData = newToken;
        }
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
