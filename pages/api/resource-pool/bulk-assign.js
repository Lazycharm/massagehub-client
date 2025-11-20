import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { resource_ids, user_id } = req.body;

    // Validate input
    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return res.status(400).json({ error: 'resource_ids array is required' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update all resources to assign to this user
    const { data, error } = await supabaseAdmin
      .from('resource_pool')
      .update({
        assigned_to_user_id: user_id,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .in('id', resource_ids)
      .select('id');

    if (error) throw error;

    const assigned = data?.length || 0;

    return res.status(200).json({
      assigned,
      message: `Assigned ${assigned} resources to ${user.name}`,
    });
  } catch (error) {
    console.error('Bulk assign error:', error);
    return res.status(500).json({ error: error.message });
  }
}
