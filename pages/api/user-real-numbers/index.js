import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Check if authenticated user making request
      const token = req.headers.authorization?.replace('Bearer ', '');
      let authenticatedUserId = null;
      
      if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          authenticatedUserId = user.id;
        }
      }

      const { user_id } = req.query;

      // If authenticated user is not admin, only show their own mini-chatrooms
      let query = supabaseAdmin
        .from('user_real_numbers')
        .select(`
          *,
          user:users(id, name, email),
          chatroom:chatrooms!assigned_chatroom_id(id, name, provider)
        `)
        .order('created_at', { ascending: false });

      if (user_id) {
        query = query.eq('user_id', user_id);
      } else if (authenticatedUserId) {
        // Non-admin users only see their own
        query = query.eq('user_id', authenticatedUserId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get client counts for each mini-chatroom
      const { data: clientCounts } = await supabaseAdmin
        .from('client_assignments')
        .select('user_real_number_id');

      const countMap = {};
      clientCounts?.forEach(ca => {
        countMap[ca.user_real_number_id] = (countMap[ca.user_real_number_id] || 0) + 1;
      });

      const enhancedData = (data || []).map(num => ({
        ...num,
        client_count: countMap[num.id] || 0
      }));

      return res.status(200).json(enhancedData);
    } catch (error) {
      console.error('Error fetching user real numbers:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { user_id, real_number, provider, label, assigned_chatroom_id, daily_message_limit } = req.body;

      if (!user_id || !real_number || !provider) {
        return res.status(400).json({ error: 'user_id, real_number, and provider are required' });
      }

      // Check if this combination already exists
      const { data: existing } = await supabaseAdmin
        .from('user_real_numbers')
        .select('id')
        .eq('user_id', user_id)
        .eq('real_number', real_number)
        .eq('provider', provider)
        .single();

      if (existing) {
        return res.status(409).json({ 
          error: `This user already has a mini-chatroom with number "${real_number}" and provider "${provider}"` 
        });
      }

      const { data, error } = await supabaseAdmin
        .from('user_real_numbers')
        .insert({
          user_id,
          real_number,
          provider,
          label: label || real_number,
          assigned_chatroom_id,
          daily_message_limit: daily_message_limit || 500,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          return res.status(409).json({ 
            error: `Mini-chatroom with number "${real_number}" and provider "${provider}" already exists for this user` 
          });
        }
        throw error;
      }

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating user real number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
