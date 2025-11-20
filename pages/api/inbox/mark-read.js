import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * API: Mark client assignment messages as read
 * PATCH /api/inbox/mark-read
 * Body: { client_assignment_id }
 * Resets unread_count to 0
 */
export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { client_assignment_id } = req.body;

    if (!client_assignment_id) {
      return res.status(400).json({ message: 'client_assignment_id is required' });
    }

    // Verify ownership
    const { data: assignment, error: verifyError } = await supabaseAdmin
      .from('client_assignments')
      .select(`
        id,
        user_real_number:user_real_numbers!inner(id, user_id)
      `)
      .eq('id', client_assignment_id)
      .single();

    if (verifyError || !assignment) {
      return res.status(404).json({ message: 'Client assignment not found' });
    }

    if (assignment.user_real_number.user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update unread count
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('client_assignments')
      .update({ 
        unread_count: 0,
        last_read_at: new Date().toISOString()
      })
      .eq('id', client_assignment_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({ 
      success: true, 
      assignment: updated 
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ message: error.message });
  }
}
