// pages/api/contacts/my-contacts.js
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

/**
 * GET: Fetch all contacts from all chatrooms the user has access to
 * Returns contacts with embedded chatroom information for routing messages
 */
export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    // Authenticate user
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all chatrooms the user has access to
    const { data: userChatrooms, error: chatroomsError } = await supabaseAdmin
      .from('user_chatrooms')
      .select(`
        chatroom_id,
        chatroom:chatrooms(
          id,
          name,
          provider,
          sender_number_id,
          sender_number:sender_numbers(
            id,
            phone_number,
            provider
          )
        )
      `)
      .eq('user_id', user.id);

    if (chatroomsError) {
      console.error('Error fetching user chatrooms:', chatroomsError);
      return res.status(500).json({ error: 'Failed to fetch chatrooms' });
    }

    if (!userChatrooms || userChatrooms.length === 0) {
      return res.status(200).json([]);
    }

    // Extract chatroom IDs
    const chatroomIds = userChatrooms.map(uc => uc.chatroom_id);

    // Fetch all contacts from these chatrooms
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select(`
        id,
        name,
        phone_number,
        email,
        tags,
        chatroom_id,
        is_favorite,
        created_at,
        updated_at
      `)
      .in('chatroom_id', chatroomIds)
      .order('name', { ascending: true });

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    // Enrich contacts with chatroom information
    const enrichedContacts = contacts.map(contact => {
      const userChatroom = userChatrooms.find(uc => uc.chatroom_id === contact.chatroom_id);
      return {
        ...contact,
        chatroom: userChatroom?.chatroom || null
      };
    });

    return res.status(200).json(enrichedContacts);

  } catch (error) {
    console.error('Unexpected error in my-contacts.js:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
