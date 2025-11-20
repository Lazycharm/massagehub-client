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

    // Get user's mini-chatrooms with client counts and last message info
    const { data: miniChatrooms, error } = await supabaseAdmin
      .from('user_real_numbers')
      .select(`
        *,
        chatroom:chatrooms!assigned_chatroom_id(id, name, provider)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[My Mini-Chatrooms] Query error:', error);
      throw error;
    }

    console.log('[My Mini-Chatrooms] Found', miniChatrooms?.length || 0, 'mini-chatrooms for user', user.id);

    // Get client counts and last message info for each mini-chatroom
    const { data: clientStats } = await supabaseAdmin
      .from('client_assignments')
      .select('user_real_number_id, status, last_message_at, unread_count');

    const statsMap = {};
    clientStats?.forEach(ca => {
      if (!statsMap[ca.user_real_number_id]) {
        statsMap[ca.user_real_number_id] = {
          total_clients: 0,
          active_clients: 0,
          unread_count: 0,
          last_message_at: null,
        };
      }
      statsMap[ca.user_real_number_id].total_clients++;
      if (ca.status === 'active') {
        statsMap[ca.user_real_number_id].active_clients++;
      }
      statsMap[ca.user_real_number_id].unread_count += ca.unread_count || 0;
      if (ca.last_message_at) {
        if (!statsMap[ca.user_real_number_id].last_message_at ||
            new Date(ca.last_message_at) > new Date(statsMap[ca.user_real_number_id].last_message_at)) {
          statsMap[ca.user_real_number_id].last_message_at = ca.last_message_at;
        }
      }
    });

    // Enhance mini-chatrooms with stats
    const enhancedData = miniChatrooms.map(mc => ({
      ...mc,
      ...statsMap[mc.id] || {
        total_clients: 0,
        active_clients: 0,
        unread_count: 0,
        last_message_at: null,
      },
    }));

    console.log('[My Mini-Chatrooms] Returning', enhancedData.length, 'mini-chatrooms with stats');
    
    return res.status(200).json(enhancedData);
  } catch (error) {
    console.error('My mini-chatrooms API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
