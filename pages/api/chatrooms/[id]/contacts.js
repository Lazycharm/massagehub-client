// pages/api/chatrooms/[id]/contacts.js
import { supabase, supabaseAdmin } from '../../../../lib/supabaseClient';
import { getUserFromRequest, checkChatroomAccess } from '../../../../lib/authMiddleware';

/**
 * GET: Fetch contacts for a specific chatroom
 * PATCH: Assign a list of contacts to a specific chatroom
 */
export default async function handler(req, res) {
  const {
    query: { id },
    method,
    body
  } = req;

  try {
    if (method === 'GET') {
      // Authenticate user
      const { user, error: authError } = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify chatroom exists and user has access
      const hasAccess = await checkChatroomAccess(user.id, id, user.role === 'admin');
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this chatroom' });
      }

      // Fetch contacts for this chatroom
      let query = supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('chatroom_id', id)
        .order('created_at', { ascending: false });

      // Non-admin users only see their own contacts
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data: contacts, error: contactsError } = await query;

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        return res.status(500).json({ error: 'Failed to fetch contacts' });
      }

      return res.status(200).json(contacts || []);
    }

    if (method === 'PATCH') {
      const { contacts } = body;

      // Authenticate user
      const { user, error: authError } = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate chatroom_id (UUID format)
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Valid chatroom ID is required' });
      }

      // Validate contacts array
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'Contacts array is required and must not be empty' });
      }

      // Verify user has access to this chatroom
      const hasAccess = await checkChatroomAccess(user.id, id, user.role === 'admin');
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this chatroom' });
      }

      // Verify chatroom exists
      const { data: chatroom, error: chatroomError } = await supabase
        .from('chatrooms')
        .select('id')
        .eq('id', id)
        .single();

      if (chatroomError || !chatroom) {
        return res.status(404).json({ error: 'Chatroom not found' });
      }

      // Sanitize and prepare contacts for insertion
      const sanitizedContacts = [];
      const skipped = [];
      
      for (const contact of contacts) {
        // Only phone_number is required
        if (!contact.phone_number || typeof contact.phone_number !== 'string') {
          skipped.push({ contact, reason: 'Missing or invalid phone_number' });
          continue;
        }

        const phoneNumber = contact.phone_number.trim();
        if (phoneNumber.length === 0) {
          skipped.push({ contact, reason: 'Empty phone_number' });
          continue;
        }

        // Check if contact already exists (phone + chatroom + user)
        const { data: existing } = await supabaseAdmin
          .from('contacts')
          .select('id, added_via')
          .eq('phone_number', phoneNumber)
          .eq('chatroom_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          // If contact exists with added_via='import' and we're adding as 'manual', update it
          if (existing.added_via === 'import' && contact.added_via === 'manual') {
            const { error: updateError } = await supabaseAdmin
              .from('contacts')
              .update({ added_via: 'manual' })
              .eq('id', existing.id);
            
            if (updateError) {
              console.error('Error updating contact added_via:', updateError);
              skipped.push({ contact, reason: 'Failed to update existing contact' });
            }
            // Don't skip - the update was successful
            continue;
          }
          
          // Otherwise skip (already exists as manual, or both are import)
          skipped.push({ contact, reason: 'Contact already exists in this chatroom' });
          continue;
        }

        sanitizedContacts.push({
          name: contact.name && contact.name.trim().length > 0 ? contact.name.trim() : 'Unknown',
          phone_number: phoneNumber,
          email: contact.email && contact.email.trim().length > 0 ? contact.email.trim().toLowerCase() : null,
          chatroom_id: id,
          user_id: user.id,
          tags: Array.isArray(contact.tags) ? contact.tags : [],
          is_favorite: false,
          added_via: contact.added_via === 'manual' ? 'manual' : 'import' // Track source
        });
      }

      if (sanitizedContacts.length === 0) {
        return res.status(400).json({ 
          error: 'No valid contacts to add',
          skipped: skipped.length,
          details: skipped
        });
      }

      // Bulk insert contacts
      const { data: insertedContacts, error: insertError } = await supabaseAdmin
        .from('contacts')
        .insert(sanitizedContacts)
        .select();

      if (insertError) {
        console.error('Supabase error inserting contacts:', insertError);
        return res.status(500).json({ error: 'Failed to add contacts', details: insertError.message });
      }

      return res.status(200).json({ 
        message: 'Contacts added successfully', 
        added: insertedContacts.length,
        skipped: skipped.length,
        contacts: insertedContacts,
        skipped_details: skipped.length > 0 ? skipped : undefined
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).end(`Method ${method} Not Allowed`);

  } catch (error) {
    console.error('Unexpected error in chatrooms/[id]/contacts.js:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
