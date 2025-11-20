import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { method, query: { id } } = req;

  try {
    if (method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('resource_pool')
        .select(`
          *,
          assigned_user:users!resource_pool_assigned_to_user_id_fkey(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Resource not found' });
        }
        throw error;
      }

      return res.status(200).json(data);
    } else if (method === 'PATCH') {
      const updates = req.body;

      // Prevent modifying these fields
      delete updates.id;
      delete updates.created_at;
      delete updates.phone_number; // Phone number should not change

      const { data, error } = await supabaseAdmin
        .from('resource_pool')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          assigned_user:users!resource_pool_assigned_to_user_id_fkey(id, name, email)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Resource not found' });
        }
        throw error;
      }

      return res.status(200).json(data);
    } else if (method === 'DELETE') {
      // Check if resource is currently in use (imported to mini-chatrooms)
      const { data: assignments } = await supabaseAdmin
        .from('client_assignments')
        .select('id')
        .eq('resource_pool_id', id)
        .limit(1);

      if (assignments && assignments.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete resource that has been imported to mini-chatrooms',
        });
      }

      const { error } = await supabaseAdmin
        .from('resource_pool')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Resource deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Resource pool API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
