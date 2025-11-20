import { supabaseAdmin } from '../lib/supabaseClient';

/**
 * Seed Example Conversations for Demo/Testing
 * 
 * This script creates 4 example conversations for a test user:
 * 1. Customer Service - Product Inquiry
 * 2. Sales Follow-up - Quote Request  
 * 3. Support Ticket - Technical Issue
 * 4. Marketing Campaign - Promotion Response
 * 
 * Usage:
 * node pages/api/seed-conversations.js <user_email>
 * 
 * Or call from another API endpoint to auto-setup demo data
 */

async function seedConversations(userEmail) {
  console.log(`🌱 Seeding conversations for user: ${userEmail}`);

  try {
    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userEmail}`);
    }

    console.log(`✓ Found user: ${user.email} (${user.id})`);

    // Find user's first mini-chatroom
    const { data: miniChatroom, error: mcError } = await supabaseAdmin
      .from('user_real_numbers')
      .select('id, real_number, label')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (mcError || !miniChatroom) {
      throw new Error('User has no active mini-chatrooms. Please create one first.');
    }

    console.log(`✓ Using mini-chatroom: ${miniChatroom.label || miniChatroom.real_number} (${miniChatroom.id})`);

    const conversations = [
      {
        name: 'Sarah Johnson',
        phone: '+15551234567',
        email: 'sarah.j@email.com',
        tags: ['customer-service', 'product-inquiry'],
        messages: [
          { dir: 'in', content: 'Hi! I saw your product on the website. Can you tell me more about the premium features?', time: 120 },
          { dir: 'in', content: 'Also, do you offer any bulk discounts for businesses?', time: 118 },
          { dir: 'out', content: 'Hello Sarah! Thank you for your interest. Our premium features include advanced analytics, priority support, and custom integrations. I can send you a detailed brochure.', time: 115 },
          { dir: 'out', content: 'Yes, we do offer bulk discounts! For businesses ordering 10+ licenses, we provide a 20% discount. For 50+, it\'s 30% off. Would you like me to prepare a custom quote for your team?', time: 114 },
          { dir: 'in', content: 'That sounds perfect! We have a team of about 25 people. Can you send me a quote?', time: 110 },
          { dir: 'in', content: 'Also, what\'s the implementation timeline?', time: 108 },
          { dir: 'out', content: 'Excellent! For 25 licenses, your total would be $3,750 (20% off regular price). I\'ll email you a detailed quote within the hour.', time: 105 },
          { dir: 'out', content: 'Implementation typically takes 2-3 business days. We provide full onboarding support and training for your team. You\'ll be up and running quickly!', time: 104 },
        ]
      },
      {
        name: 'Michael Chen',
        phone: '+15559876543',
        email: 'michael.chen@company.com',
        tags: ['sales', 'enterprise', 'hot-lead'],
        unread: 1,
        messages: [
          { dir: 'out', content: 'Hi Michael! It was great meeting you at the Tech Expo yesterday. As discussed, I\'m following up on the enterprise solution for Tech Solutions Inc.', time: 300 },
          { dir: 'in', content: 'Hi! Yes, we\'re very interested. Our team needs a solution for about 100 users. What\'s your pricing structure?', time: 285 },
          { dir: 'in', content: 'We\'re looking to implement by end of Q1. Is that feasible?', time: 284 },
          { dir: 'out', content: 'Perfect! For 100 users, our enterprise package is $12,000/year (30% volume discount included). This includes dedicated support, custom training, and priority implementation.', time: 280 },
          { dir: 'out', content: 'Absolutely! Q1 timeline is very doable. I\'ll prepare a detailed proposal with implementation roadmap. Can we schedule a call with your team next week?', time: 279 },
          { dir: 'in', content: 'That pricing works for us. Let me check with my team and get back to you tomorrow with some dates for the call.', time: 30 },
        ]
      },
      {
        name: 'Jennifer Martinez',
        phone: '+15557654321',
        email: 'j.martinez@startup.io',
        tags: ['support', 'technical', 'resolved'],
        messages: [
          { dir: 'in', content: 'Hey, I\'m having trouble connecting to the API. Getting 401 errors consistently.', time: 1440 },
          { dir: 'in', content: 'I\'ve checked my API key multiple times. It looks correct to me.', time: 1439 },
          { dir: 'out', content: 'Hi Jennifer! I\'m sorry you\'re experiencing issues. Let me help you troubleshoot. Can you confirm you\'re including the API key in the Authorization header as "Bearer YOUR_KEY"?', time: 1435 },
          { dir: 'in', content: 'Oh! I was just putting the key directly, not using "Bearer". Let me try that.', time: 1430 },
          { dir: 'in', content: 'That worked! I\'m connected now. Thanks so much!', time: 1428 },
          { dir: 'out', content: 'Excellent! Glad that resolved it. The Bearer prefix is required for our OAuth2 implementation. Is there anything else I can help you with?', time: 1425 },
          { dir: 'in', content: 'Nope, all good now! Really appreciate the quick response.', time: 1420 },
          { dir: 'out', content: 'You\'re very welcome! Don\'t hesitate to reach out if you need anything else. Have a great day! 😊', time: 1418 },
        ]
      },
      {
        name: 'David Thompson',
        phone: '+15558887777',
        email: 'david.t@gmail.com',
        tags: ['marketing', 'promotion', 'interested'],
        unread: 2,
        messages: [
          { dir: 'out', content: '🎉 SPRING SALE! Get 40% off all products this week only. Use code SPRING40 at checkout. Shop now: bit.ly/spring-sale', time: 4320 },
          { dir: 'in', content: 'Is this discount valid on all items including the new releases?', time: 4250 },
          { dir: 'in', content: 'And does it work with other promotions?', time: 4248 },
          { dir: 'out', content: 'Great question! Yes, the SPRING40 code works on everything including new releases. However, it cannot be combined with other promotions - but 40% is already our best deal!', time: 4240 },
          { dir: 'in', content: 'Perfect! I\'m looking at the premium bundle. What\'s the total with discount?', time: 4180 },
          { dir: 'out', content: 'The premium bundle is normally $299. With SPRING40, you\'ll pay just $179.40! That\'s a savings of $119.60. Plus free shipping! 📦', time: 4175 },
          { dir: 'in', content: 'Wow that\'s a great deal! Just placed my order. Order #12345. When will it ship?', time: 4150 },
          { dir: 'in', content: 'Also, do you have a tracking system?', time: 60 },
        ]
      }
    ];

    let successCount = 0;

    for (const conv of conversations) {
      console.log(`\n📝 Creating conversation with ${conv.name}...`);

      // Create contact
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('contacts')
        .insert({
          name: conv.name,
          phone_number: conv.phone,
          email: conv.email,
          metadata: { segment: conv.tags[0] }
        })
        .select()
        .single();

      if (contactError) {
        console.error(`  ✗ Error creating contact: ${contactError.message}`);
        continue;
      }

      console.log(`  ✓ Contact created: ${contact.name}`);

      // Create client assignment
      const lastMessageTime = Math.min(...conv.messages.map(m => m.time));
      const { data: assignment, error: assignError } = await supabaseAdmin
        .from('client_assignments')
        .insert({
          user_real_number_id: miniChatroom.id,
          contact_id: contact.id,
          status: 'active',
          last_message_at: new Date(Date.now() - lastMessageTime * 60000).toISOString(),
          message_count: conv.messages.length,
          unread_count: conv.unread || 0,
          metadata: {
            tags: conv.tags,
            label: conv.name
          }
        })
        .select()
        .single();

      if (assignError) {
        console.error(`  ✗ Error creating assignment: ${assignError.message}`);
        continue;
      }

      console.log(`  ✓ Client assignment created`);

      // Create messages
      let messageCount = 0;
      for (const msg of conv.messages) {
        const timestamp = new Date(Date.now() - msg.time * 60000).toISOString();

        if (msg.dir === 'in') {
          await supabaseAdmin.from('inbound_messages').insert({
            from_address: conv.phone,
            to_address: miniChatroom.real_number,
            content: msg.content,
            type: 'sms',
            status: 'delivered',
            created_at: timestamp
          });
        } else {
          await supabaseAdmin.from('messages').insert({
            user_id: user.id,
            user_real_number_id: miniChatroom.id,
            type: 'sms',
            phone_number: conv.phone,
            message_content: msg.content,
            from_number: miniChatroom.real_number,
            status: 'sent',
            sent_at: timestamp,
            created_at: timestamp
          });
        }
        messageCount++;
      }

      console.log(`  ✓ Created ${messageCount} messages`);
      successCount++;
    }

    console.log(`\n✅ Successfully created ${successCount}/${conversations.length} conversations!`);
    console.log(`\n💬 Conversation summary:`);
    console.log(`   1. Sarah Johnson - Customer Service (Product Inquiry)`);
    console.log(`   2. Michael Chen - Sales Follow-up (1 unread) 🔔`);
    console.log(`   3. Jennifer Martinez - Support (Technical Issue Resolved)`);
    console.log(`   4. David Thompson - Marketing Campaign (2 unread) 🔔`);
    console.log(`\nGo to Chatbox to see the conversations! 🚀`);

    return { success: true, count: successCount };

  } catch (error) {
    console.error('❌ Error seeding conversations:', error.message);
    throw error;
  }
}

// Export for use in API endpoints
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_email } = req.body;

    if (!user_email) {
      return res.status(400).json({ error: 'user_email is required' });
    }

    const result = await seedConversations(user_email);
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Allow running from command line
if (require.main === module) {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.error('❌ Usage: node pages/api/seed-conversations.js <user_email>');
    process.exit(1);
  }
  seedConversations(userEmail)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
