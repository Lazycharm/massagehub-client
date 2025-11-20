import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * API: Get current user's assigned chatrooms with contact counts
 * GET /api/user-chatrooms/my-chatrooms
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('[My Chatrooms] No token provided');
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    if (!supabaseAdmin) {
      console.error('[My Chatrooms] supabaseAdmin is null - service role key missing!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.log('[My Chatrooms] Auth failed:', authError?.message);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[My Chatrooms] Fetching chatrooms for user:', user.id);

    // Get user's chatroom assignments with chatroom details  
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('user_chatrooms')
      .select(`
        chatroom_id,
        created_at
      `)
      .eq('user_id', user.id);

    console.log('[My Chatrooms] Assignments query result:', { 
      count: assignments?.length || 0, 
      error: assignmentsError,
      assignments 
    });

    if (assignmentsError) {
      console.error('[My Chatrooms] Error fetching assignments:', assignmentsError);
      return res.status(500).json({ error: 'Failed to fetch chatrooms' });
    }

    if (!assignments || assignments.length === 0) {
      console.log('[My Chatrooms] No chatrooms found for user');
      return res.status(200).json([]);
    }

    // Fetch full chatroom details separately
    const chatroomIds = assignments.map(a => a.chatroom_id);
    
    console.log('[My Chatrooms] Fetching chatroom details for IDs:', chatroomIds);
    
    const { data: chatrooms, error: chatroomsError } = await supabaseAdmin
      .from('chatrooms')
      .select('id, name, provider, sender_number')
      .in('id', chatroomIds);

    console.log('[My Chatrooms] Chatrooms query result:', { 
      count: chatrooms?.length || 0, 
      error: chatroomsError,
      chatrooms 
    });

    if (chatroomsError) {
      console.error('[My Chatrooms] Error fetching chatrooms:', chatroomsError);
      return res.status(500).json({ error: 'Failed to fetch chatroom details' });
    }

    // Map chatrooms by ID for easy lookup
    const chatroomMap = {};
    chatrooms?.forEach(cr => {
      chatroomMap[cr.id] = cr;
    });
    // Get contact counts for each chatroom
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('chatroom_id, id')
      .eq('user_id', user.id)
      .in('chatroom_id', chatroomIds);

    if (contactsError) {
      console.error('[My Chatrooms] Error fetching contacts:', contactsError);
      // Continue without contact counts
    }

    // Count contacts per chatroom
    const contactCounts = {};
    contacts?.forEach(contact => {
      contactCounts[contact.chatroom_id] = (contactCounts[contact.chatroom_id] || 0) + 1;
    });

    // Enhance assignments with chatroom data and contact counts
    const enhancedAssignments = assignments.map(assignment => ({
      chatroom_id: assignment.chatroom_id,
      created_at: assignment.created_at,
      chatroom: chatroomMap[assignment.chatroom_id] || null,
      contact_count: contactCounts[assignment.chatroom_id] || 0,
      unread_count: 0 // TODO: Implement unread count logic
    }));

    console.log('[My Chatrooms] Returning', enhancedAssignments.length, 'chatrooms');

    return res.status(200).json(enhancedAssignments);

  } catch (error) {
    console.error('[My Chatrooms] Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
