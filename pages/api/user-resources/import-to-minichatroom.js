import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Get authenticated user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Import] Authenticated user:', user.id);

    const { resource_ids, user_real_number_id } = req.body;

    // Validate input
    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return res.status(400).json({ error: 'resource_ids array is required' });
    }

    if (!user_real_number_id) {
      return res.status(400).json({ error: 'user_real_number_id is required' });
    }

    // Verify that the mini-chatroom belongs to the authenticated user
    const { data: miniChatroom, error: miniError } = await supabaseAdmin
      .from('user_real_numbers')
      .select('id, user_id')
      .eq('id', user_real_number_id)
      .eq('user_id', user.id)
      .single();

    if (miniError || !miniChatroom) {
      console.error('[Import] Mini-chatroom error:', miniError);
      return res.status(404).json({ error: 'Mini-chatroom not found or access denied' });
    }

    console.log('[Import] Mini-chatroom verified:', miniChatroom.id);

    // Verify that all resources are assigned to this user
    const { data: resources, error: resourceError } = await supabaseAdmin
      .from('resource_pool')
      .select('id, phone_number, assigned_to_user_id, first_name, tags')
      .in('id', resource_ids)
      .eq('assigned_to_user_id', user.id);

    if (resourceError) throw resourceError;

    console.log('[Import] Found resources:', resources?.length);

    if (resources.length !== resource_ids.length) {
      return res.status(403).json({ 
        error: 'Some resources are not assigned to you or do not exist' 
      });
    }

    // For each resource, create or find the contact, then create client_assignment
    const results = [];
    let imported = 0;
    let skipped = 0;

    for (const resource of resources) {
      // Find or create contact
      let { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('phone_number', resource.phone_number)
        .single();

      if (!contact) {
        // Create contact
        const { data: newContact, error: contactError } = await supabaseAdmin
          .from('contacts')
          .insert({
            name: resource.first_name || resource.phone_number,
            phone_number: resource.phone_number,
          })
          .select('id')
          .single();

        if (contactError) {
          console.error('[Import] Error creating contact:', contactError);
          continue;
        }
        contact = newContact;
      }

      // Check if already assigned
      const { data: existing } = await supabaseAdmin
        .from('client_assignments')
        .select('id')
        .eq('user_real_number_id', user_real_number_id)
        .eq('contact_id', contact.id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Create client assignment
      const { error: assignError } = await supabaseAdmin
        .from('client_assignments')
        .insert({
          user_real_number_id: user_real_number_id,
          contact_id: contact.id,
          status: 'active',
          metadata: {
            imported_from_resource_pool: resource.id,
            tags: resource.tags || [],
            label: resource.first_name || resource.phone_number,
          },
        });

      if (assignError) {
        console.error('[Import] Error creating assignment:', assignError);
        continue;
      }

      imported++;
      results.push(contact.id);
    }

    console.log('[Import] Results:', { imported, skipped });

    return res.status(200).json({
      imported,
      skipped,
      message: `Imported ${imported} clients${
        skipped > 0 ? `, skipped ${skipped} already imported` : ''
      }`,
    });
  } catch (error) {
    console.error('Import to mini-chatroom error:', error);
    return res.status(500).json({ error: error.message });
  }
}
