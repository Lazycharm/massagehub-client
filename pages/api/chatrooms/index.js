// pages/api/chatrooms/index.js
import { supabase } from '../../../lib/supabaseClient';
import { getUserFromRequest, getUserChatroomIds } from '../../../lib/authMiddleware';

/**
 * GET: Fetch chatrooms (filtered by user permissions)
 * POST: Create a new chatroom with name and sender_number
 */
export default async function handler(req, res) {
  try {
    // GET: Return chatrooms based on user permissions
    if (req.method === 'GET') {
      const { user, error: authError } = await getUserFromRequest(req);

      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: authError || 'Authentication required' 
        });
      }

      let chatrooms;

      if (user.role === 'admin') {
        // Admins see all chatrooms
        const { data, error } = await supabase
          .from('chatrooms')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error fetching chatrooms:', error);
          return res.status(500).json({ error: 'Failed to fetch chatrooms', details: error.message });
        }

        chatrooms = data || [];
      } else {
        // Agents see only their assigned chatrooms
        const chatroomIds = await getUserChatroomIds(user.id, false);

        if (chatroomIds.length === 0) {
          return res.status(200).json([]);
        }

        const { data, error } = await supabase
          .from('chatrooms')
          .select('*')
          .in('id', chatroomIds)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error fetching chatrooms:', error);
          return res.status(500).json({ error: 'Failed to fetch chatrooms', details: error.message });
        }

        chatrooms = data || [];
      }

      return res.status(200).json(chatrooms);
    }

    // POST: Create a new chatroom (admin only)
    if (req.method === 'POST') {
      const { user, error: authError } = await getUserFromRequest(req);

      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: authError || 'Authentication required' 
        });
      }

      if (user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'Admin access required to create chatrooms' 
        });
      }

      const { name, sender_number } = req.body;

      // Validate required fields
      if (!name || !sender_number) {
        return res.status(400).json({ error: 'Chatroom name and sender_number are required' });
      }

      // Sanitize inputs
      const sanitizedName = name.trim();
      const sanitizedNumber = sender_number.trim();

      if (sanitizedName.length === 0 || sanitizedNumber.length === 0) {
        return res.status(400).json({ error: 'Name and sender_number cannot be empty' });
      }

      // Insert new chatroom into Supabase
      const { data, error } = await supabase
        .from('chatrooms')
        .insert([{ name: sanitizedName, sender_number: sanitizedNumber }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating chatroom:', error);
        return res.status(500).json({ error: 'Failed to create chatroom', details: error.message });
      }

      return res.status(201).json(data);
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Unexpected error in chatrooms/index.js:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

