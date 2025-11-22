// pages/api/messages/inbound/index.js
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseClient';
import { getUserFromRequest, getUserChatroomIds } from '../../../../lib/authMiddleware';

// Disable body parsing so we can handle form data from Twilio
export const config = {
  api: {
    bodyParser: true, // Enable Next.js body parser
  },
};

/**
 * POST: Twilio webhook endpoint for inbound SMS messages
 * Validates the to_number against chatrooms.sender_number
 * Stores message in inbound_messages table with matched chatroom_id
 * 
 * Expected Twilio payload (form-urlencoded):
 * - From: sender's phone number
 * - To: recipient's phone number (your Twilio number)
 * - Body: message content
 */
export default async function handler(req, res) {
  console.log('[Inbound Webhook] Method:', req.method, 'Headers:', req.headers['content-type']);
  
  try {
    // POST: Twilio webhook for inbound messages (no auth required - Twilio calls this)
    if (req.method === 'POST') {
      console.log('[Inbound Webhook] Received request from Twilio');
      console.log('[Inbound Webhook] Body:', req.body);
      console.log('[Inbound Webhook] Body type:', typeof req.body);
      
      const { From, To, Body, MessageSid } = req.body;

      // Validate required Twilio parameters
      if (!From || !To || !Body) {
        console.error('[Inbound Webhook] Missing required fields:', { From, To, Body: Body ? 'present' : 'missing' });
        return res.status(400).json({ 
          error: 'Missing required fields: From, To, and Body are required' 
        });
      }

      // Sanitize inputs
      const fromNumber = From.trim();
      const toNumber = To.trim();
      const content = Body.trim();

      console.log('[Inbound Webhook] From:', fromNumber, 'To:', toNumber, 'Content length:', content.length);

      // Find chatroom by matching sender_number (use supabaseAdmin to bypass RLS)
      const { data: chatrooms, error: chatroomError } = await supabaseAdmin
        .from('chatrooms')
        .select('id, sender_number')
        .eq('sender_number', toNumber)
        .limit(1);

      if (chatroomError) {
        console.error('[Inbound Webhook] Supabase error finding chatroom:', chatroomError);
        return res.status(500).json({ error: 'Database error', details: chatroomError.message });
      }

      console.log('[Inbound Webhook] Chatrooms found:', chatrooms?.length || 0);

      // Validate that the sender number belongs to a chatroom
      if (!chatrooms || chatrooms.length === 0) {
        console.warn(`[Inbound Webhook] No chatroom found for sender number: ${toNumber}`);
        return res.status(404).json({ 
          error: 'Chatroom not found for this sender number',
          to_number: toNumber
        });
      }

      const chatroomId = chatrooms[0].id;
      console.log('[Inbound Webhook] Matched chatroom ID:', chatroomId);

      // Check if contact exists, if not create it automatically
      const { data: existingContact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('phone_number', fromNumber)
        .eq('chatroom_id', chatroomId)
        .maybeSingle();

      if (!existingContact) {
        // Auto-create contact for unknown sender
        const { error: contactError } = await supabaseAdmin
          .from('contacts')
          .insert([{
            phone_number: fromNumber,
            name: 'Unknown', // Will be updated when identity is known
            chatroom_id: chatroomId,
            added_via: 'manual'
          }]);

        if (contactError) {
          console.error('[Inbound Webhook] Warning: Failed to auto-create contact:', contactError);
          // Continue anyway - contact creation is not critical for message storage
        } else {
          console.log(`[Inbound Webhook] Auto-created contact for new sender: ${fromNumber}`);
        }
      }

      // Insert inbound message into database
      const { data: inboundMsg, error: insertError } = await supabaseAdmin
        .from('inbound_messages')
        .insert([{
          from_number: fromNumber,
          chatroom_id: chatroomId,
          content: content
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[Inbound Webhook] Supabase error inserting inbound message:', insertError);
        return res.status(500).json({ error: 'Failed to store message', details: insertError.message });
      }

      console.log('[Inbound Webhook] Stored inbound message:', inboundMsg.id);

      // Also store in the main messages table for unified inbox
      const { data: mainMsg, error: messageError } = await supabaseAdmin
        .from('messages')
        .insert([{
          from_number: fromNumber,
          to_number: toNumber,
          content: content,
          type: 'sms',
          read: false,
          chatroom_id: chatroomId,
          direction: 'inbound'
        }])
        .select()
        .single();

      if (messageError) {
        console.error('[Inbound Webhook] Supabase error inserting into messages table:', messageError);
        // Don't fail the request since inbound_messages was successful
      } else {
        console.log('[Inbound Webhook] Stored in messages table:', mainMsg.id);
      }

      console.log('[Inbound Webhook] Successfully processed inbound message');

      // Respond to Twilio with TwiML (empty response = 200 OK)
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      
    } else if (req.method === 'GET') {
      // GET: Test endpoint or fetch inbound messages
      const { test } = req.query;
      
      // Simple test endpoint (no auth required)
      if (test === 'true') {
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook endpoint is accessible',
          timestamp: new Date().toISOString()
        });
      }
      
      // Fetch all inbound messages (for testing/admin purposes) - REQUIRES AUTH
      const { user, error: authError } = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let query = supabase
        .from('inbound_messages')
        .select('*, chatrooms(name, sender_number)')
        .order('created_at', { ascending: false });

      // Filter by user permissions
      if (user.role !== 'admin') {
        const chatroomIds = await getUserChatroomIds(user.id, false);
        if (chatroomIds.length === 0) {
          return res.status(200).json([]);
        }
        query = query.in('chatroom_id', chatroomIds);
      }

      const { data: messages, error } = await query;

      if (error) {
        console.error('Supabase error fetching inbound messages:', error);
        return res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
      }

      return res.status(200).json(messages || []);
      
    } else {
      // Method not allowed
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    console.error('Unexpected error in messages/inbound/index.js:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

