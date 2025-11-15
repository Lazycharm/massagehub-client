import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = req.body;
      
      const { data, error } = await supabase
        .from('settings')
        .insert([{ key, value }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating setting:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
