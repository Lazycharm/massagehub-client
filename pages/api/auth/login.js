import { supabase } from '../../../lib/supabaseClient';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: email and password' 
      });
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('Login error:', authError);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: authError?.message || 'Authentication failed'
      });
    }

    // Check if session exists
    if (!authData.session || !authData.session.access_token) {
      console.error('No session returned from Supabase Auth');
      return res.status(500).json({ 
        error: 'Authentication failed - no session created'
      });
    }

    // Fetch user profile from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      // User authenticated but no profile - create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.email.split('@')[0],
          role: 'agent'
        }])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user profile:', createError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      // Set secure httpOnly cookie
      res.setHeader('Set-Cookie', cookie.serialize('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      }));

      return res.status(200).json({
        user: newUser,
        session: authData.session,
      });
    }

    // Set secure httpOnly cookie
    res.setHeader('Set-Cookie', cookie.serialize('sb-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    }));

    return res.status(200).json({
      user: userData,
      session: authData.session,
    });
  } catch (error) {
    console.error('Login handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
