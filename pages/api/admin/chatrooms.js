import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all chatrooms with enhanced info
      const { data: chatrooms, error } = await supabaseAdmin
        .from('chatrooms')
        .select(`
          *,
          provider_account:api_providers(provider_name, provider_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get message counts per chatroom
      const { data: messageCounts } = await supabaseAdmin
        .from('messages')
        .select('chatroom_id')
        .not('chatroom_id', 'is', null);

      // Get user assignments per chatroom
      const { data: userAssignments } = await supabaseAdmin
        .from('user_chatrooms')
        .select('chatroom_id, user_id');

      // Aggregate counts
      const countMap = {};
      const userCountMap = {};

      messageCounts?.forEach(msg => {
        countMap[msg.chatroom_id] = (countMap[msg.chatroom_id] || 0) + 1;
      });

      userAssignments?.forEach(ua => {
        userCountMap[ua.chatroom_id] = (userCountMap[ua.chatroom_id] || 0) + 1;
      });

      // Enhance chatrooms with counts
      const enhancedChatrooms = (chatrooms || []).map(room => ({
        ...room,
        message_count: countMap[room.id] || 0,
        user_count: userCountMap[room.id] || 0
      }));

      return res.status(200).json(enhancedChatrooms);
    } catch (error) {
      console.error('Error fetching chatrooms:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, sender_number, sender_number_id, provider, provider_account_id, is_active, capabilities, metadata } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Chatroom name is required' });
      }

      const insertData = {
        name: name.trim(),
        sender_number: sender_number?.trim(),
        sender_number_id: sender_number_id || null,
        provider: provider || 'twilio',
        provider_account_id: provider_account_id || null,
        is_active: is_active !== undefined ? is_active : true,
        capabilities: capabilities || { sms: true },
        metadata: metadata || {}
      };

      const { data, error } = await supabaseAdmin
        .from('chatrooms')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating chatroom:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
