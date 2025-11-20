import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * API: Send a message through a mini-chatroom to a client
 * POST /api/inbox/send-message
 * Body: { client_assignment_id, message_content, message_type }
 * Routes through the correct provider based on the mini-chatroom's parent chatroom
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { client_assignment_id, message_content, message_type = 'sms' } = req.body;

    if (!client_assignment_id || !message_content) {
      return res.status(400).json({ message: 'client_assignment_id and message_content are required' });
    }

    console.log('[Send Message] Fetching assignment:', client_assignment_id);

    // Fetch the complete routing chain: client_assignment → user_real_number → chatroom → provider
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('client_assignments')
      .select(`
        *,
        user_real_number:user_real_numbers(
          id,
          user_id,
          real_number,
          assigned_chatroom_id,
          chatroom:chatrooms(
            id,
            name,
            provider,
            sender_number_id,
            sender_number:sender_numbers(id, phone_number, provider, api_provider_id)
          )
        ),
        contact:contacts(id, name, phone_number, email)
      `)
      .eq('id', client_assignment_id)
      .single();

    console.log('[Send Message] Assignment query result:', { assignment, error: assignmentError });

    if (assignmentError || !assignment) {
      return res.status(404).json({ message: 'Client assignment not found' });
    }

    // Verify ownership
    if (assignment.user_real_number.user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify routing chain is complete
    const miniChatroom = assignment.user_real_number;
    const chatroom = miniChatroom.chatroom;
    const senderNumber = chatroom?.sender_number;

    if (!chatroom || !senderNumber) {
      return res.status(400).json({ 
        message: 'Incomplete routing: Mini-chatroom must be linked to a chatroom with a sender number' 
      });
    }

    // Prepare message data
    const messageData = {
      user_id: user.id,
      user_real_number_id: miniChatroom.id,
      chatroom_id: chatroom.id,
      contact_id: assignment.contact_id,
      client_assignment_id: client_assignment_id,
      type: message_type,
      phone_number: assignment.contact_number,
      email: assignment.contact.email,
      message_content: message_content,
      from_number: miniChatroom.real_number,
      status: 'pending',
      provider: chatroom.provider,
      metadata: {
        chatroom_name: chatroom.name,
        sender_number: senderNumber.phone_number,
        contact_name: assignment.contact.name
      }
    };

    // Insert message into messages table
    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Route through the appropriate provider
    let deliveryResult = null;
    let deliveryError = null;

    try {
      // Get provider credentials from api_providers table
      if (senderNumber.api_provider_id) {
        const { data: apiProvider } = await supabaseAdmin
          .from('api_providers')
          .select('provider_name, credentials')
          .eq('id', senderNumber.api_provider_id)
          .single();

        if (apiProvider && message_type === 'sms') {
          // Use unified SMS provider endpoint
          const providerResponse = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/providers/send-sms`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              provider_name: apiProvider.provider_name,
              credentials: apiProvider.credentials,
              from: senderNumber.phone_number,
              to: assignment.contact.phone_number,
              message: message_content
            })
          });

          deliveryResult = await providerResponse.json();
          
          if (deliveryResult.success) {
            // Update message status to sent
            await supabaseAdmin
              .from('messages')
              .update({ 
                status: 'sent',
                external_id: deliveryResult.message_sid || deliveryResult.message_id,
                sent_at: new Date().toISOString(),
                metadata: {
                  ...messageData.metadata,
                  provider_response: deliveryResult
                }
              })
              .eq('id', newMessage.id);
          } else {
            deliveryError = deliveryResult.error || 'Failed to send via provider';
          }
        } else if (message_type === 'email') {
          // Email provider (to be implemented)
          deliveryError = 'Email provider not yet implemented';
        } else {
          deliveryError = 'No API provider configured for this sender number';
        }
      } else {
        deliveryError = 'Sender number has no API provider configured';
      }
    } catch (providerError) {
      console.error('Provider error:', providerError);
      deliveryError = providerError.message;
    }

    // If delivery failed, update message status
    if (deliveryError) {
      await supabaseAdmin
        .from('messages')
        .update({ 
          status: 'failed',
          error_message: deliveryError
        })
        .eq('id', newMessage.id);
    }

    // Update client_assignment with last message info
    await supabaseAdmin
      .from('client_assignments')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_content: message_content.substring(0, 200)
      })
      .eq('id', client_assignment_id);

    return res.status(deliveryError ? 500 : 200).json({
      message: newMessage,
      delivery: deliveryError ? { success: false, error: deliveryError } : { success: true, result: deliveryResult }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ message: error.message });
  }
}
