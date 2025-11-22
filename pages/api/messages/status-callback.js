import { supabase } from '../../../lib/supabaseClient';

/**
 * POST: Twilio Status Callback - Updates message delivery status
 * Twilio calls this endpoint when message status changes
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  try {
    const {
      MessageSid,
      MessageStatus,
      From,
      To,
      ErrorCode,
      ErrorMessage
    } = req.body;

    console.log('[Status Callback] Received:', {
      MessageSid,
      MessageStatus,
      From,
      To,
      ErrorCode,
      ErrorMessage
    });

    if (!MessageSid || !MessageStatus) {
      console.error('[Status Callback] Missing required fields');
      return res.status(400).json({ error: 'Missing MessageSid or MessageStatus' });
    }

    // Update message status in database
    const { data, error } = await supabase
      .from('messages')
      .update({ 
        status: MessageStatus.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('twilio_message_sid', MessageSid)
      .select()
      .single();

    if (error) {
      console.error('[Status Callback] Database update error:', error);
      // Don't return error to Twilio - we still processed it
      return res.status(200).json({ 
        success: false,
        message: 'Status received but database update failed',
        error: error.message 
      });
    }

    console.log('[Status Callback] Updated message:', data?.id, 'to status:', MessageStatus);

    return res.status(200).json({ 
      success: true,
      message: 'Status updated successfully',
      messageId: data?.id
    });

  } catch (error) {
    console.error('[Status Callback] Error:', error);
    // Always return 200 to Twilio so they don't retry
    return res.status(200).json({ 
      success: false,
      message: 'Error processing status callback',
      error: error.message 
    });
  }
}
