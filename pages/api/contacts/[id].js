import { supabaseAdmin } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // Authenticate user
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate contact ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid contact ID is required' });
    }

    // Fetch the contact to verify it exists and user has access
    const { data: contact, error: fetchError } = await supabaseAdmin
      .from('contacts')
      .select(`
        id,
        name,
        phone_number,
        email,
        chatroom_id,
        is_favorite,
        tags,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (fetchError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if user has access to this contact's chatroom
    const { data: userChatroom } = await supabaseAdmin
      .from('user_chatrooms')
      .select('chatroom_id')
      .eq('user_id', user.id)
      .eq('chatroom_id', contact.chatroom_id)
      .single();

    // Admins have access to all contacts
    if (user.role !== 'admin' && !userChatroom) {
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    if (req.method === 'GET') {
      return res.status(200).json(contact);
    }

    if (req.method === 'PATCH') {
      const updates = req.body;

      // Validate updates
      const allowedFields = ['name', 'phone_number', 'email', 'tags', 'is_favorite'];
      const sanitizedUpdates = {};
      
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = updates[key];
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data, error } = await supabaseAdmin
        .from('contacts')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating contact:', error);
        return res.status(500).json({ error: 'Failed to update contact' });
      }

      return res.status(200).json({
        message: 'Contact updated successfully',
        contact: data
      });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contact:', error);
        return res.status(500).json({ error: 'Failed to delete contact' });
      }

      return res.status(200).json({
        message: 'Contact deleted successfully',
        id
      });
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Unexpected error in contacts/[id].js:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
