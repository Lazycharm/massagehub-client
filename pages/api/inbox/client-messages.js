import { supabase } from '../../../lib/supabaseClient';

/**
 * API: Get messages for a specific client assignment
 * GET /api/inbox/client-messages?client_assignment_id=xxx
 * Returns combined inbound/outbound messages for the client conversation
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { client_assignment_id } = req.query;
    if (!client_assignment_id) {
      return res.status(400).json({ message: 'client_assignment_id is required' });
    }

    // Verify the client assignment belongs to the user's mini-chatroom
    const { data: assignment, error: assignmentError } = await supabase
      .from('client_assignments')
      .select(`
        *,
        user_real_number:user_real_numbers(id, user_id, real_number),
        contact:contacts(id, name, phone, email)
      `)
      .eq('id', client_assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({ message: 'Client assignment not found' });
    }

    if (assignment.user_real_number.user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch inbound messages for this client
    const { data: inboundMessages, error: inboundError } = await supabase
      .from('inbound_messages')
      .select('*')
      .eq('to_address', assignment.user_real_number.real_number)
      .eq('from_address', assignment.contact_number)
      .order('created_at', { ascending: true });

    if (inboundError) throw inboundError;

    // Fetch outbound messages for this client
    const { data: outboundMessages, error: outboundError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_real_number_id', assignment.user_real_number_id)
      .or(`phone_number.eq.${assignment.contact_number},email.eq.${assignment.contact.email}`)
      .order('created_at', { ascending: true });

    if (outboundError) throw outboundError;

    // Combine and sort messages
    const combined = [
      ...(inboundMessages || []).map(m => ({ 
        ...m, 
        direction: 'inbound',
        message_type: m.type || 'sms',
        content: m.content,
        timestamp: m.created_at
      })),
      ...(outboundMessages || []).map(m => ({ 
        ...m, 
        direction: 'outbound',
        message_type: m.type || 'sms',
        content: m.message_content || m.content,
        timestamp: m.created_at
      }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.status(200).json({
      messages: combined,
      assignment: assignment,
      contact: assignment.contact
    });
  } catch (error) {
    console.error('Error fetching client messages:', error);
    return res.status(500).json({ message: error.message });
  }
}
