import { supabaseAdmin } from '../../../../../lib/supabaseClient';

// Bulk assign users to a chatroom
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const { user_ids } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ error: 'user_ids array is required' });
      }

      // Check if chatroom exists
      const { data: chatroom } = await supabaseAdmin
        .from('chatrooms')
        .select('id')
        .eq('id', id)
        .single();

      if (!chatroom) {
        return res.status(404).json({ error: 'Chatroom not found' });
      }

      // Create assignments
      const assignments = user_ids.map(user_id => ({
        user_id,
        chatroom_id: id
      }));

      const { data, error } = await supabaseAdmin
        .from('user_chatrooms')
        .upsert(assignments, {
          onConflict: 'user_id,chatroom_id',
          ignoreDuplicates: true
        })
        .select();

      if (error) throw error;

      return res.status(200).json({
        assigned: data?.length || 0,
        message: `Assigned ${data?.length || 0} users to chatroom`
      });
    } catch (error) {
      console.error('Error assigning users:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const { error } = await supabaseAdmin
        .from('user_chatrooms')
        .delete()
        .eq('chatroom_id', id)
        .eq('user_id', user_id);

      if (error) throw error;

      return res.status(200).json({ message: 'User removed from chatroom' });
    } catch (error) {
      console.error('Error removing user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
