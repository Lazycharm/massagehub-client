import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('sender_numbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching sender numbers:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { label, number_or_id, type, region, active } = req.body;
      
      const { data, error } = await supabase
        .from('sender_numbers')
        .insert([{ label, number_or_id, type, region, active: active !== false }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating sender number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
