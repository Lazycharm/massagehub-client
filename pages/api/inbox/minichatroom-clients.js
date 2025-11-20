import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Get authenticated user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { minichatroom_id } = req.query;

    if (!minichatroom_id) {
      return res.status(400).json({ error: 'minichatroom_id is required' });
    }

    console.log('[Minichatroom Clients] Fetching clients for minichatroom:', minichatroom_id, 'user:', user.id);

    // Verify mini-chatroom belongs to user
    const { data: miniChatroom } = await supabaseAdmin
      .from('user_real_numbers')
      .select('id, user_id')
      .eq('id', minichatroom_id)
      .eq('user_id', user.id)
      .single();

    if (!miniChatroom) {
      return res.status(404).json({ error: 'Mini-chatroom not found or access denied' });
    }

    // Get all clients in this mini-chatroom
    const { data: clients, error } = await supabaseAdmin
      .from('client_assignments')
      .select(`
        *,
        contact:contacts(id, name, phone_number, email)
      `)
      .eq('user_real_number_id', minichatroom_id)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return res.status(200).json(clients || []);
  } catch (error) {
    console.error('Mini-chatroom clients API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
