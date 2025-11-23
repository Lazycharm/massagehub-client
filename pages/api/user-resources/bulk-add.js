import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * POST: Bulk import resources from CSV for a user
 */
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

    const { resources } = req.body;

    if (!resources || !Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ error: 'Resources array is required' });
    }

    console.log('[Bulk Add Resources] Processing', resources.length, 'resources for user:', user.id);

    const added = [];
    const skipped = [];

    for (const resource of resources) {
      const phoneNumber = resource.phone_number?.trim();
      
      if (!phoneNumber) {
        skipped.push({ resource, reason: 'Missing phone number' });
        continue;
      }

      // Check if already exists
      const { data: existing } = await supabaseAdmin
        .from('resource_pool')
        .select('id')
        .eq('phone_number', phoneNumber)
        .eq('assigned_to_user_id', user.id)
        .maybeSingle();

      if (existing) {
        skipped.push({ resource, reason: 'Already exists' });
        continue;
      }

      // Add resource
      const { data: newResource, error: insertError } = await supabaseAdmin
        .from('resource_pool')
        .insert([{
          phone_number: phoneNumber,
          first_name: resource.first_name?.trim() || null,
          last_name: resource.last_name?.trim() || null,
          email: resource.email?.trim() || null,
          tags: Array.isArray(resource.tags) ? resource.tags : [],
          status: 'assigned',
          assigned_to_user_id: user.id,
          assigned_at: new Date().toISOString(),
          metadata: {
            added_by: 'user',
            source: 'bulk_import'
          }
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[Bulk Add] Error inserting:', insertError);
        skipped.push({ resource, reason: insertError.message });
      } else {
        added.push(newResource);
      }
    }

    console.log('[Bulk Add Resources] Added:', added.length, 'Skipped:', skipped.length);

    return res.status(200).json({
      message: `Successfully added ${added.length} resource(s)${skipped.length > 0 ? `, skipped ${skipped.length}` : ''}`,
      added: added.length,
      skipped: skipped.length,
      resources: added,
      skipped_details: skipped
    });

  } catch (error) {
    console.error('[Bulk Add Resources] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
