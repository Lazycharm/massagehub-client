import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';
import { requireAdmin } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  try {
    // Require admin role
    const authResult = await requireAdmin(req, res);
    if (!authResult.user) {
      return; // Response already sent by requireAdmin
    }

    // GET: List all user-chatroom assignments
    if (req.method === 'GET') {
      console.log('[User Chatrooms GET] Fetching all assignments...');
      
      const { data, error } = await supabaseAdmin
        .from('user_chatrooms')
        .select(`
          user_id,
          chatroom_id,
          created_at,
          users (id, email, name, role),
          chatrooms (id, name, sender_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[User Chatrooms GET] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('[User Chatrooms GET] Found', data?.length || 0, 'assignments');
      return res.status(200).json(data || []);
    }

    // POST: Assign user to chatroom
    if (req.method === 'POST') {
      const { user_id, chatroom_id } = req.body;

      if (!user_id || !chatroom_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: user_id and chatroom_id' 
        });
      }

      console.log('[User Chatrooms POST] Assigning user', user_id, 'to chatroom', chatroom_id);

      // Check if assignment already exists
      const { data: existing } = await supabaseAdmin
        .from('user_chatrooms')
        .select('*')
        .eq('user_id', user_id)
        .eq('chatroom_id', chatroom_id)
        .maybeSingle();

      if (existing) {
        console.log('[User Chatrooms POST] Assignment already exists');
        return res.status(409).json({ 
          error: 'User is already assigned to this chatroom' 
        });
      }

      // Create assignment
      const { data, error } = await supabaseAdmin
        .from('user_chatrooms')
        .insert([{ user_id, chatroom_id }])
        .select()
        .single();

      if (error) {
        console.error('[User Chatrooms POST] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('[User Chatrooms POST] Assignment created successfully');
      return res.status(201).json(data);
    }

    // DELETE: Remove user from chatroom
    if (req.method === 'DELETE') {
      const { user_id, chatroom_id } = req.body;

      if (!user_id || !chatroom_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: user_id and chatroom_id' 
        });
      }

      console.log('[User Chatrooms DELETE] Removing user', user_id, 'from chatroom', chatroom_id);

      const { error } = await supabaseAdmin
        .from('user_chatrooms')
        .delete()
        .eq('user_id', user_id)
        .eq('chatroom_id', chatroom_id);

      if (error) {
        console.error('[User Chatrooms DELETE] Error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('[User Chatrooms DELETE] Assignment removed successfully');
      return res.status(200).json({ message: 'Assignment removed successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('User-chatrooms handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

