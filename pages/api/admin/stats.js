import { supabaseAdmin } from '../../../lib/supabaseClient';
import { verifyAuth } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin user
    const user = await verifyAuth(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch all data using admin client to bypass RLS
    const [messagesRes, usersRes, chatroomsRes, senderNumbersRes] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from('users')
        .select('*'),
      supabaseAdmin
        .from('chatrooms')
        .select('*'),
      supabaseAdmin
        .from('sender_numbers')
        .select('*')
    ]);

    if (messagesRes.error) throw messagesRes.error;
    if (usersRes.error) throw usersRes.error;
    if (chatroomsRes.error) throw chatroomsRes.error;
    if (senderNumbersRes.error) throw senderNumbersRes.error;

    res.status(200).json({
      messages: messagesRes.data || [],
      users: usersRes.data || [],
      chatrooms: chatroomsRes.data || [],
      senderNumbers: senderNumbersRes.data || []
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message });
  }
}
