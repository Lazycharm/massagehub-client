import { supabaseAdmin } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('chatrooms')
        .select(`
          *,
          provider_account:api_providers(provider_name, provider_type)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Chatroom not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching chatroom:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;
      delete updates.id;
      delete updates.created_at;

      const { data, error } = await supabaseAdmin
        .from('chatrooms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Chatroom not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error updating chatroom:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if chatroom has messages
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('chatroom_id', id)
        .limit(1);

      if (messages && messages.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete chatroom with existing messages. Archive it instead.' 
        });
      }

      const { error } = await supabaseAdmin
        .from('chatrooms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Chatroom deleted successfully' });
    } catch (error) {
      console.error('Error deleting chatroom:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
