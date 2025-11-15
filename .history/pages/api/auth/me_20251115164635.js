import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // In a real app, you would get the user ID from the session/JWT
      // For now, returning a mock admin user
      // TODO: Implement real Supabase Auth
      
      const mockUser = {
        id: '1',
        email: 'admin@messagehub.space',
        full_name: 'Admin User',
        role: 'admin',
        created_at: new Date().toISOString()
      };

      return res.status(200).json(mockUser);
    } catch (error) {
      console.error('Error fetching current user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { full_name } = req.body;
      
      // TODO: Update real user from Supabase Auth
      const mockUser = {
        id: '1',
        email: 'admin@messagehub.space',
        full_name: full_name || 'Admin User',
        role: 'admin',
        created_at: new Date().toISOString()
      };

      return res.status(200).json(mockUser);
    } catch (error) {
      console.error('Error updating current user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
