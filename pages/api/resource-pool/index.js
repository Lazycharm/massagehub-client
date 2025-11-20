import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      // Get query parameters for filtering
      const { user_id, tags, search, status } = req.query;

      let query = supabaseAdmin
        .from('resource_pool')
        .select(`
          *,
          assigned_user:users!resource_pool_assigned_to_user_id_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false });

      // Filter by assigned user
      if (user_id) {
        query = query.eq('assigned_to_user_id', user_id);
      }

      // Filter by status
      if (status === 'available') {
        query = query.is('assigned_to_user_id', null);
      } else if (status === 'assigned') {
        query = query.not('assigned_to_user_id', 'is', null);
      }

      // Filter by tags (array contains)
      if (tags) {
        const tagArray = tags.split(',').map(t => t.trim());
        query = query.contains('tags', tagArray);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter on client-side (phone number or label)
      let filteredData = data;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = data.filter(
          r =>
            r.phone_number?.toLowerCase().includes(searchLower) ||
            r.label?.toLowerCase().includes(searchLower)
        );
      }

      return res.status(200).json(filteredData);
    } else if (method === 'POST') {
      const { phone_number, label, tags, assigned_user_id, metadata } = req.body;

      // Validate required fields
      if (!phone_number) {
        return res.status(400).json({ error: 'phone_number is required' });
      }

      // Check if phone number already exists
      const { data: existing } = await supabaseAdmin
        .from('resource_pool')
        .select('id')
        .eq('phone_number', phone_number)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Phone number already exists in resource pool' });
      }

      const insertData = {
        phone_number,
        first_name: label || null,
        tags: tags || [],
        assigned_to_user_id: assigned_user_id || null,
        metadata: metadata || {},
      };

      const { data, error } = await supabaseAdmin
        .from('resource_pool')
        .insert(insertData)
        .select(`
          *,
          assigned_user:users!resource_pool_assigned_to_user_id_fkey(id, name, email)
        `)
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Resource pool API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
