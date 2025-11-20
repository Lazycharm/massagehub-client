import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * API: Import assigned resources as contacts to a chatroom
 * POST /api/user-resources/import-to-chatroom
 * Body: { resource_ids: string[], chatroom_id: string }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    if (!supabaseAdmin) {
      console.error('[Import] supabaseAdmin is null - service role key missing!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.log('[Import] Auth failed:', authError?.message);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const { resource_ids, chatroom_id } = req.body;

    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return res.status(400).json({ error: 'resource_ids array is required' });
    }

    if (!chatroom_id) {
      return res.status(400).json({ error: 'chatroom_id is required' });
    }

    console.log('[Import] Authenticated user:', user.id);
    console.log('[Import] Importing', resource_ids.length, 'resources to chatroom:', chatroom_id);

    // Verify user has access to this chatroom
    const { data: chatroomAccess, error: accessError } = await supabaseAdmin
      .from('user_chatrooms')
      .select('chatroom_id')
      .eq('user_id', user.id)
      .eq('chatroom_id', chatroom_id)
      .single();

    if (accessError || !chatroomAccess) {
      return res.status(403).json({ error: 'You do not have access to this chatroom' });
    }

    console.log('[Import] Chatroom access verified');

    // Fetch the resources assigned to this user
    const { data: resources, error: resourceError } = await supabaseAdmin
      .from('resource_pool')
      .select('*')
      .in('id', resource_ids)
      .eq('assigned_to_user_id', user.id);

    if (resourceError) {
      console.error('[Import] Error fetching resources:', resourceError);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }

    if (resources.length !== resource_ids.length) {
      return res.status(403).json({ 
        error: 'Some resources are not assigned to you or do not exist' 
      });
    }

    console.log('[Import] Found resources:', resources.length);

    // Import each resource as a contact
    let imported = 0;
    let skipped = 0;

    for (const resource of resources) {
      // Check if contact already exists in this chatroom
      const { data: existingContact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('phone_number', resource.phone_number)
        .eq('chatroom_id', chatroom_id)
        .eq('user_id', user.id)
        .single();

      if (existingContact) {
        console.log('[Import] Contact already exists:', resource.phone_number);
        skipped++;
        continue;
      }

      // Create new contact
      const { error: contactError } = await supabaseAdmin
        .from('contacts')
        .insert({
          user_id: user.id,
          chatroom_id: chatroom_id,
          name: resource.first_name || resource.phone_number,
          phone_number: resource.phone_number,
          email: resource.email || null,
          tags: [],
          metadata: {
            imported_from_resource: resource.id,
            resource_first_name: resource.first_name,
            resource_last_name: resource.last_name,
            resource_company: resource.company,
            import_date: new Date().toISOString()
          }
        });

      if (contactError) {
        console.error('[Import] Error creating contact:', contactError);
        skipped++;
        continue;
      }

      imported++;
    }

    console.log('[Import] Results:', { imported, skipped });

    const message = `Imported ${imported} client${imported !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} (already exist)` : ''}`;

    return res.status(200).json({ 
      imported, 
      skipped,
      message 
    });

  } catch (error) {
    console.error('[Import] Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
