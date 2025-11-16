import { supabaseAdmin } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Service Role Key Check:');
    console.log('- Exists:', !!serviceRoleKey);
    console.log('- Length:', serviceRoleKey?.length || 0);
    console.log('- First 20 chars:', serviceRoleKey?.substring(0, 20));

    // Try to list users using admin client
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Admin API Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        hasServiceKey: !!serviceRoleKey,
        keyLength: serviceRoleKey?.length
      });
    }

    console.log('Successfully listed users:', data.users.length);
    
    return res.status(200).json({ 
      success: true, 
      userCount: data.users.length,
      hasServiceKey: !!serviceRoleKey,
      keyLength: serviceRoleKey?.length,
      users: data.users.map(u => ({ id: u.id, email: u.email }))
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
