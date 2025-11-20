import { supabaseAdmin } from '../../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../../lib/authMiddleware';

/**
 * GET: Fetch messages for a specific contact
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  try {
    // Authenticate user
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Contact Messages] Fetching messages for contact:', id, 'user:', user.id);

    // Get the contact to verify access and get phone number
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id, phone_number, chatroom_id, user_id')
      .eq('id', id)
      .single();

    if (contactError || !contact) {
      console.error('[Contact Messages] Contact not found:', contactError);
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Verify user has access to this contact
    if (user.role !== 'admin' && contact.user_id !== user.id) {
      console.log('[Contact Messages] Access denied - contact user_id:', contact.user_id, 'user:', user.id);
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    // Fetch messages to/from this contact's phone number
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('chatroom_id', contact.chatroom_id)
      .or(`to_number.eq.${contact.phone_number},from_number.eq.${contact.phone_number}`)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[Contact Messages] Error fetching messages:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    console.log('[Contact Messages] Found', messages?.length || 0, 'messages');

    return res.status(200).json(messages || []);
  } catch (error) {
    console.error('[Contact Messages] Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
