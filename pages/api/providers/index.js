import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mask sensitive credentials for security
      const safeData = (data || []).map(provider => ({
        ...provider,
        credentials: provider.credentials ? { masked: true } : {}
      }));

      return res.status(200).json(safeData);
    } catch (error) {
      console.error('Error fetching providers:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { provider_type, provider_name, credentials, config, is_active } = req.body;

      // Validation
      if (!provider_type || !provider_name) {
        return res.status(400).json({ error: 'provider_type and provider_name are required' });
      }

      const validTypes = ['sms', 'email', 'viber', 'whatsapp'];
      if (!validTypes.includes(provider_type)) {
        return res.status(400).json({ error: 'Invalid provider_type' });
      }

      // TODO: Get actual user ID from auth
      const created_by = null; // Will be set from auth token

      const { data, error } = await supabaseAdmin
        .from('api_providers')
        .insert({
          provider_type,
          provider_name,
          credentials: credentials || {},
          config: config || {},
          is_active: is_active !== undefined ? is_active : true,
          created_by
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating provider:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
