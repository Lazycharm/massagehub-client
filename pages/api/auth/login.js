import { supabase } from '../../../lib/supabaseClient';
import { setCookie } from 'cookies-next';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email and password',
      });
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData?.user) {
      console.error('Login error:', authError);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: authError?.message || 'Authentication failed',
      });
    }

    // Fetch profile from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', authData.user.id)
      .single();

    let finalUser = userData;

    // If profile not found, create profile
    if (userError || !userData) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.email.split('@')[0],
            role: 'agent',
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create user profile:', createError);
        return res
          .status(500)
          .json({ error: 'Failed to create user profile' });
      }

      finalUser = newUser;
    }

    // Set HTTP-only cookies with session tokens
    setCookie('sb-access-token', authData.session.access_token, {
      req,
      res,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    setCookie('sb-refresh-token', authData.session.refresh_token, {
      req,
      res,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return res.status(200).json({
      user: finalUser,
      session: authData.session,
      access_token: authData.session.access_token, // Add this so client can store it
    });
  } catch (error) {
    console.error('Login handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

