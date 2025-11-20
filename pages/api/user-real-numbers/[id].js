import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_real_numbers')
        .select(`
          *,
          user:users(id, name, email),
          chatroom:chatrooms(id, name, provider)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'User real number not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching user real number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;
      delete updates.id;
      delete updates.created_at;
      delete updates.user_id; // Don't allow changing user

      const { data, error } = await supabaseAdmin
        .from('user_real_numbers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'User real number not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error updating user real number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if there are client assignments
      const { data: assignments } = await supabaseAdmin
        .from('client_assignments')
        .select('id')
        .eq('user_real_number_id', id)
        .limit(1);

      if (assignments && assignments.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete mini-chatroom with existing client assignments' 
        });
      }

      const { error } = await supabaseAdmin
        .from('user_real_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'User real number deleted successfully' });
    } catch (error) {
      console.error('Error deleting user real number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
