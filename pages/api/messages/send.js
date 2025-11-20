// pages/api/messages/send.js
import { supabase } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

/**
 * POST: Send outbound SMS via Twilio or Infobip
 * Required fields:
 * - chatroom_id: ID of the chatroom to send from
 * - to_number: Recipient's phone number
 * - content: Message content
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  try {
    // Authenticate user
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: authError || 'Authentication required' 
      });
    }

    const { chatroom_id, to_number, content } = req.body;

    // Validate required fields
    if (!chatroom_id || !to_number || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: chatroom_id, to_number, and content are required' 
      });
    }

    // Check token balance (admins have unlimited tokens)
    let tokenData = null;
    if (user.role !== 'admin') {
      const { data: tokens, error: tokenError } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokens || tokens.balance < 1) {
        return res.status(402).json({ 
          error: 'Insufficient tokens',
          message: 'You do not have enough credits to send this message. Please contact your administrator.'
        });
      }

      tokenData = tokens;

      // Deduct 1 token
      const { error: deductError } = await supabase
        .from('user_tokens')
        .update({ balance: tokenData.balance - 1 })
        .eq('user_id', user.id);

      if (deductError) {
        console.error('Failed to deduct token:', deductError);
        return res.status(500).json({ 
          error: 'Failed to deduct token',
          message: 'An error occurred while processing your request.'
        });
      }
    }

    // Fetch chatroom with sender number info
    const { data: chatroom, error: chatroomError } = await supabase
      .from('chatrooms')
      .select(`
        id, 
        sender_number,
        provider,
        sender_number_id,
        sender_numbers (
          id,
          number_or_id,
          provider,
          type
        )
      `)
      .eq('id', chatroom_id)
      .single();

    if (chatroomError || !chatroom) {
      console.error('[Send Message] Chatroom not found:', chatroomError);
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    console.log('[Send Message] Chatroom:', chatroom.id, 'Provider:', chatroom.provider, 'Sender:', chatroom.sender_number_id);

    // Get the sender number (from_number)
    const fromNumber = chatroom.sender_numbers?.number_or_id || chatroom.sender_number;
    const provider = chatroom.provider || 'twilio';

    if (!fromNumber) {
      console.error('[Send Message] No sender number configured for chatroom');
      return res.status(400).json({ 
        error: 'Chatroom does not have a sender number configured. Please contact your administrator.' 
      });
    }

    console.log('[Send Message] Sending from:', fromNumber, 'to:', to_number, 'via:', provider);

    // Send SMS via appropriate provider
    let messageSid = null;
    let messageStatus = 'pending';

    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        console.error('[Send Message] Twilio credentials not configured');
        return res.status(500).json({ 
          error: 'Twilio not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment variables.' 
        });
      }

      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);

        const twilioMessage = await client.messages.create({
          body: content.trim(),
          from: fromNumber,
          to: to_number.trim()
        });
        messageSid = twilioMessage.sid;
        messageStatus = twilioMessage.status;
        console.log('[Send Message] Twilio message sent:', messageSid);
      } catch (twilioError) {
        console.error('[Send Message] Twilio error:', twilioError);
        return res.status(400).json({ 
          error: 'Failed to send via Twilio',
          details: twilioError.message 
        });
      }
    } else if (provider === 'infobip') {
      const apiKey = process.env.INFOBIP_API_KEY;
      const baseUrl = process.env.INFOBIP_BASE_URL;

      if (!apiKey || !baseUrl) {
        console.error('[Send Message] Infobip credentials not configured');
        return res.status(500).json({ 
          error: 'Infobip not configured. Please add INFOBIP_API_KEY and INFOBIP_BASE_URL to environment variables.' 
        });
      }

      try {
        const response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
          method: 'POST',
          headers: {
            'Authorization': `App ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            messages: [{
              from: fromNumber,
              destinations: [{ to: to_number.trim() }],
              text: content.trim()
            }]
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error('[Send Message] Infobip error:', data);
          return res.status(400).json({ 
            error: 'Failed to send via Infobip',
            details: data.requestError?.serviceException?.text || 'Unknown error'
          });
        }

        messageSid = data.messages?.[0]?.messageId || 'infobip-' + Date.now();
        messageStatus = data.messages?.[0]?.status?.groupName || 'sent';
        console.log('[Send Message] Infobip message sent:', messageSid);
      } catch (infobipError) {
        console.error('[Send Message] Infobip error:', infobipError);
        return res.status(400).json({ 
          error: 'Failed to send via Infobip',
          details: infobipError.message 
        });
      }
    } else {
      console.error('[Send Message] Unsupported provider:', provider);
      return res.status(400).json({ 
        error: `Provider ${provider} not supported yet` 
      });
    }

    // Store the sent message in the messages table
    const { data: storedMessage, error: insertError } = await supabase
      .from('messages')
      .insert([{
        from_number: fromNumber,
        to_number: to_number.trim(),
        content: content.trim(),
        type: 'sms',
        direction: 'outbound',
        read: true,
        chatroom_id: chatroom_id,
        twilio_message_sid: messageSid,
        status: messageStatus,
        user_id: user.id
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[Send Message] Error storing message:', insertError);
      // Don't fail the request since message was sent successfully
      return res.status(200).json({ 
        success: true,
        message: 'Message sent successfully but failed to store in database',
        message_sid: messageSid,
        warning: insertError.message
      });
    }

    console.log('[Send Message] Message stored successfully:', storedMessage.id);

    return res.status(200).json({ 
      success: true,
      message: 'Message sent successfully',
      message_sid: messageSid,
      data: storedMessage,
      tokens_remaining: user.role === 'admin' ? 'unlimited' : tokenData.balance - 1
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Check if it's a Twilio error
    if (error.code) {
      return res.status(400).json({ 
        error: 'Twilio error',
        details: error.message,
        code: error.code
      });
    }

    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
}

