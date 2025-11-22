import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

    console.log('[My Resources] Authenticated user:', user.id);

    // Get resources assigned to this user using supabaseAdmin to bypass RLS
    const { data: resources, error: resourceError } = await supabaseAdmin
      .from('resource_pool')
      .select('*')
      .eq('assigned_to_user_id', user.id)
      .order('created_at', { ascending: false });

    if (resourceError) {
      console.error('[My Resources] Error fetching resources:', resourceError);
      throw resourceError;
    }

    console.log('[My Resources] Found resources:', resources?.length || 0);

    if (!resources || resources.length === 0) {
      return res.status(200).json([]);
    }

    // Check which resources are imported as contacts (NEW simplified architecture)
    // A resource is "imported" only if it exists in contacts with added_via='manual'
    // Resources with added_via='import' are still available to "Start Chat"
    const phoneNumbers = resources.map(r => r.phone_number);
    
    const { data: importedContacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('added_via', 'manual') // Only count manually added contacts as "imported"
      .in('phone_number', phoneNumbers);

    if (contactsError) {
      console.error('[My Resources] Error checking imported contacts:', contactsError);
    }

    const importedPhones = new Set(importedContacts?.map(c => c.phone_number) || []);

    // Enhance resources with import status
    const enhancedResources = resources.map(r => ({
      ...r,
      is_imported: importedPhones.has(r.phone_number)
    }));

    console.log('[My Resources] Returning', enhancedResources.length, 'resources,', importedPhones.size, 'imported');
    return res.status(200).json(enhancedResources);
  } catch (error) {
    console.error('My resources API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
