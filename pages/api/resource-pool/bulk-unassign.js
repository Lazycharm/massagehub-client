import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { resource_ids } = req.body;

    // Validate input
    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return res.status(400).json({ error: 'resource_ids array is required' });
    }

    // Update all resources to remove user assignment
    const { data, error } = await supabaseAdmin
      .from('resource_pool')
      .update({
        assigned_to_user_id: null,
        assigned_at: null,
        status: 'available',
        updated_at: new Date().toISOString(),
      })
      .in('id', resource_ids)
      .select('id');

    if (error) throw error;

    const unassigned = data?.length || 0;

    return res.status(200).json({
      unassigned,
      message: `Unassigned ${unassigned} resources`,
    });
  } catch (error) {
    console.error('Bulk unassign error:', error);
    return res.status(500).json({ error: error.message });
  }
}
