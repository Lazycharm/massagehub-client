import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * POST: Add a new resource to user's personal resource pool
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

    const { phone_number, first_name, last_name, email, tags } = req.body;

    // Validate required fields
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if resource already exists for this user
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('resource_pool')
      .select('id')
      .eq('phone_number', phone_number.trim())
      .eq('assigned_to_user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('[Add Resource] Error checking existing:', checkError);
      throw checkError;
    }

    if (existing) {
      return res.status(400).json({ error: 'This resource already exists in your pool' });
    }

    // Create new resource
    const { data: newResource, error: insertError } = await supabaseAdmin
      .from('resource_pool')
      .insert([{
        phone_number: phone_number.trim(),
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        email: email?.trim() || null,
        tags: Array.isArray(tags) ? tags : [],
        status: 'assigned',
        assigned_to_user_id: user.id,
        assigned_at: new Date().toISOString(),
        metadata: {
          added_by: 'user',
          source: 'manual'
        }
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[Add Resource] Error inserting:', insertError);
      throw insertError;
    }

    console.log('[Add Resource] Created resource:', newResource.id);
    return res.status(201).json({
      message: 'Resource added successfully',
      resource: newResource
    });

  } catch (error) {
    console.error('[Add Resource] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
