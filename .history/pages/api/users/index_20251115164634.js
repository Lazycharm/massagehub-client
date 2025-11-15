import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email, full_name, role } = req.body;
      
      const { data, error } = await supabase
        .from('users')
        .insert([{ email, full_name, role: role || 'user' }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
