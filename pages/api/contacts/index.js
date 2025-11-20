import { supabase } from '../../../lib/supabaseClient';
import { getUserFromRequest, getUserChatroomIds, checkChatroomAccess } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Require authentication
      const { user, error: authError } = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { chatroom_id } = req.query;
      
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by user permissions
      if (user.role !== 'admin') {
        const chatroomIds = await getUserChatroomIds(user.id, false);
        if (chatroomIds.length === 0) {
          return res.status(200).json([]);
        }
        
        // If specific chatroom requested, verify access
        if (chatroom_id) {
          if (!chatroomIds.includes(chatroom_id)) {
            return res.status(403).json({ error: 'Access denied to this chatroom' });
          }
          // Filter by both chatroom AND user_id (new simplified architecture)
          query = query.eq('chatroom_id', chatroom_id).eq('user_id', user.id);
        } else {
          // Return contacts from all accessible chatrooms for this user
          query = query.in('chatroom_id', chatroomIds).eq('user_id', user.id);
        }
      } else {
        // Admin sees all contacts
        if (chatroom_id) {
          query = query.eq('chatroom_id', chatroom_id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      // Require authentication
      const { user, error: authError } = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, phone_number, email, tags, chatroom_id } = req.body;
      
      // Verify chatroom access
      if (chatroom_id) {
        const hasAccess = await checkChatroomAccess(user.id, chatroom_id, user.role === 'admin');
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this chatroom' });
        }
      }
      
      // Check for duplicate phone number in same chatroom
      if (phone_number && chatroom_id) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_number', phone_number)
          .eq('chatroom_id', chatroom_id)
          .single();
        
        if (existing) {
          return res.status(409).json({ error: 'Contact with this phone number already exists in this chatroom' });
        }
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ name, phone_number, email, tags, chatroom_id }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating contact:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

