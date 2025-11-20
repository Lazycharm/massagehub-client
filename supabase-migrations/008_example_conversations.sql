-- Example Conversations for Demo/Testing
-- This adds 4 example conversations to demonstrate the Chatbox functionality
-- Run this after setting up a user with mini-chatrooms

-- Note: You'll need to replace these UUIDs with actual UUIDs from your database
-- This is a template that should be customized per environment

-- Example conversation scenarios:
-- 1. Customer Service - Product Inquiry
-- 2. Sales Follow-up - Quote Request
-- 3. Support Ticket - Technical Issue
-- 4. Marketing Campaign - Promotion Response

-- Instructions to use this:
-- 1. Create a test user if you don't have one
-- 2. Assign them a mini-chatroom (user_real_number)
-- 3. Import some resources (creates contacts and client_assignments)
-- 4. Update the variables below with actual IDs from your database
-- 5. Run this migration

DO $$
DECLARE
  -- Variables to store your actual IDs - UPDATE THESE!
  v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Your test user ID
  v_mini_chatroom_id UUID := '00000000-0000-0000-0000-000000000002'; -- User's mini-chatroom ID
  v_mini_chatroom_number TEXT := '+1234567890'; -- The real_number of the mini-chatroom
  
  -- Contact IDs (will be created)
  v_contact1_id UUID;
  v_contact2_id UUID;
  v_contact3_id UUID;
  v_contact4_id UUID;
  
  -- Client assignment IDs (will be created)
  v_assignment1_id UUID;
  v_assignment2_id UUID;
  v_assignment3_id UUID;
  v_assignment4_id UUID;

BEGIN
  -- Only run if you've updated the variables above
  -- Remove this check when ready to use
  IF v_user_id = '00000000-0000-0000-0000-000000000001' THEN
    RAISE NOTICE 'Please update the user_id and mini_chatroom_id variables in this migration file first!';
    RETURN;
  END IF;

  -- ============================================
  -- Example 1: Customer Service - Product Inquiry
  -- ============================================
  
  -- Create contact
  INSERT INTO contacts (name, phone, email, metadata)
  VALUES (
    'Sarah Johnson',
    '+15551234567',
    'sarah.j@email.com',
    '{"segment": "Customer Service", "source": "Website Form"}'::jsonb
  )
  RETURNING id INTO v_contact1_id;

  -- Create client assignment
  INSERT INTO client_assignments (
    user_real_number_id,
    contact_id,
    status,
    last_message_at,
    message_count,
    unread_count,
    metadata
  )
  VALUES (
    v_mini_chatroom_id,
    v_contact1_id,
    'active',
    NOW() - INTERVAL '2 hours',
    8,
    0,
    '{"tags": ["customer-service", "product-inquiry"], "label": "Sarah Johnson"}'::jsonb
  )
  RETURNING id INTO v_assignment1_id;

  -- Add conversation messages
  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15551234567', v_mini_chatroom_number, 'Hi! I saw your product on the website. Can you tell me more about the premium features?', 'sms', 'delivered', NOW() - INTERVAL '2 hours'),
    ('+15551234567', v_mini_chatroom_number, 'Also, do you offer any bulk discounts for businesses?', 'sms', 'delivered', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15551234567', 'Hello Sarah! Thank you for your interest. Our premium features include advanced analytics, priority support, and custom integrations. I can send you a detailed brochure.', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '1 hour 55 minutes', NOW() - INTERVAL '1 hour 55 minutes'),
    (v_user_id, v_mini_chatroom_id, 'sms', '+15551234567', 'Yes, we do offer bulk discounts! For businesses ordering 10+ licenses, we provide a 20% discount. For 50+, it''s 30% off. Would you like me to prepare a custom quote for your team?', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '1 hour 54 minutes', NOW() - INTERVAL '1 hour 54 minutes');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15551234567', v_mini_chatroom_number, 'That sounds perfect! We have a team of about 25 people. Can you send me a quote?', 'sms', 'delivered', NOW() - INTERVAL '1 hour 50 minutes'),
    ('+15551234567', v_mini_chatroom_number, 'Also, what''s the implementation timeline?', 'sms', 'delivered', NOW() - INTERVAL '1 hour 48 minutes');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15551234567', 'Excellent! For 25 licenses, your total would be $3,750 (20% off regular price). I''ll email you a detailed quote within the hour.', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '1 hour 45 minutes', NOW() - INTERVAL '1 hour 45 minutes'),
    (v_user_id, v_mini_chatroom_id, 'sms', '+15551234567', 'Implementation typically takes 2-3 business days. We provide full onboarding support and training for your team. You''ll be up and running quickly!', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '1 hour 44 minutes', NOW() - INTERVAL '1 hour 44 minutes');

  -- ============================================
  -- Example 2: Sales Follow-up - Quote Request
  -- ============================================
  
  INSERT INTO contacts (name, phone, email, metadata)
  VALUES (
    'Michael Chen',
    '+15559876543',
    'michael.chen@company.com',
    '{"segment": "Sales", "source": "Trade Show", "company": "Tech Solutions Inc"}'::jsonb
  )
  RETURNING id INTO v_contact2_id;

  INSERT INTO client_assignments (
    user_real_number_id,
    contact_id,
    status,
    last_message_at,
    message_count,
    unread_count,
    metadata
  )
  VALUES (
    v_mini_chatroom_id,
    v_contact2_id,
    'active',
    NOW() - INTERVAL '5 hours',
    6,
    1,
    '{"tags": ["sales", "enterprise", "hot-lead"], "label": "Michael Chen"}'::jsonb
  )
  RETURNING id INTO v_assignment2_id;

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15559876543', 'Hi Michael! It was great meeting you at the Tech Expo yesterday. As discussed, I''m following up on the enterprise solution for Tech Solutions Inc.', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15559876543', v_mini_chatroom_number, 'Hi! Yes, we''re very interested. Our team needs a solution for about 100 users. What''s your pricing structure?', 'sms', 'delivered', NOW() - INTERVAL '4 hours 45 minutes'),
    ('+15559876543', v_mini_chatroom_number, 'We''re looking to implement by end of Q1. Is that feasible?', 'sms', 'delivered', NOW() - INTERVAL '4 hours 44 minutes');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15559876543', 'Perfect! For 100 users, our enterprise package is $12,000/year (30% volume discount included). This includes dedicated support, custom training, and priority implementation.', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '4 hours 40 minutes', NOW() - INTERVAL '4 hours 40 minutes'),
    (v_user_id, v_mini_chatroom_id, 'sms', '+15559876543', 'Absolutely! Q1 timeline is very doable. I''ll prepare a detailed proposal with implementation roadmap. Can we schedule a call with your team next week?', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '4 hours 39 minutes', NOW() - INTERVAL '4 hours 39 minutes');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15559876543', v_mini_chatroom_number, 'That pricing works for us. Let me check with my team and get back to you tomorrow with some dates for the call.', 'sms', 'delivered', NOW() - INTERVAL '30 minutes');

  -- Update unread count for this conversation
  UPDATE client_assignments SET unread_count = 1 WHERE id = v_assignment2_id;

  -- ============================================
  -- Example 3: Support Ticket - Technical Issue
  -- ============================================
  
  INSERT INTO contacts (name, phone, email, metadata)
  VALUES (
    'Jennifer Martinez',
    '+15557654321',
    'j.martinez@startup.io',
    '{"segment": "Support", "source": "Existing Customer", "account_status": "Premium"}'::jsonb
  )
  RETURNING id INTO v_contact3_id;

  INSERT INTO client_assignments (
    user_real_number_id,
    contact_id,
    status,
    last_message_at,
    message_count,
    unread_count,
    metadata
  )
  VALUES (
    v_mini_chatroom_id,
    v_contact3_id,
    'active',
    NOW() - INTERVAL '1 day',
    12,
    0,
    '{"tags": ["support", "technical", "resolved"], "label": "Jennifer Martinez", "ticket_id": "SUP-1234"}'::jsonb
  )
  RETURNING id INTO v_assignment3_id;

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15557654321', v_mini_chatroom_number, 'Hey, I''m having trouble connecting to the API. Getting 401 errors consistently.', 'sms', 'delivered', NOW() - INTERVAL '1 day'),
    ('+15557654321', v_mini_chatroom_number, 'I''ve checked my API key multiple times. It looks correct to me.', 'sms', 'delivered', NOW() - INTERVAL '1 day' + INTERVAL '1 minute');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15557654321', 'Hi Jennifer! I''m sorry you''re experiencing issues. Let me help you troubleshoot. Can you confirm you''re including the API key in the Authorization header as "Bearer YOUR_KEY"?', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '23 hours 55 minutes', NOW() - INTERVAL '23 hours 55 minutes');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15557654321', v_mini_chatroom_number, 'Oh! I was just putting the key directly, not using "Bearer". Let me try that.', 'sms', 'delivered', NOW() - INTERVAL '23 hours 50 minutes'),
    ('+15557654321', v_mini_chatroom_number, 'That worked! I''m connected now. Thanks so much!', 'sms', 'delivered', NOW() - INTERVAL '23 hours 48 minutes');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15557654321', 'Excellent! Glad that resolved it. The Bearer prefix is required for our OAuth2 implementation. Is there anything else I can help you with?', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '23 hours 45 minutes', NOW() - INTERVAL '23 hours 45 minutes');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15557654321', v_mini_chatroom_number, 'Nope, all good now! Really appreciate the quick response.', 'sms', 'delivered', NOW() - INTERVAL '23 hours 40 minutes');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15557654321', 'You''re very welcome! Don''t hesitate to reach out if you need anything else. Have a great day! 😊', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '23 hours 38 minutes', NOW() - INTERVAL '23 hours 38 minutes');

  -- ============================================
  -- Example 4: Marketing Campaign - Promotion Response
  -- ============================================
  
  INSERT INTO contacts (name, phone, email, metadata)
  VALUES (
    'David Thompson',
    '+15558887777',
    'david.t@gmail.com',
    '{"segment": "Marketing", "source": "SMS Campaign", "campaign": "Spring Sale 2024"}'::jsonb
  )
  RETURNING id INTO v_contact4_id;

  INSERT INTO client_assignments (
    user_real_number_id,
    contact_id,
    status,
    last_message_at,
    message_count,
    unread_count,
    metadata
  )
  VALUES (
    v_mini_chatroom_id,
    v_contact4_id,
    'active',
    NOW() - INTERVAL '3 days',
    10,
    2,
    '{"tags": ["marketing", "promotion", "interested"], "label": "David Thompson"}'::jsonb
  )
  RETURNING id INTO v_assignment4_id;

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15558887777', '🎉 SPRING SALE! Get 40% off all products this week only. Use code SPRING40 at checkout. Shop now: bit.ly/spring-sale', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15558887777', v_mini_chatroom_number, 'Is this discount valid on all items including the new releases?', 'sms', 'delivered', NOW() - INTERVAL '2 days 22 hours'),
    ('+15558887777', v_mini_chatroom_number, 'And does it work with other promotions?', 'sms', 'delivered', NOW() - INTERVAL '2 days 21 hours 58 minutes');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15558887777', 'Great question! Yes, the SPRING40 code works on everything including new releases. However, it cannot be combined with other promotions - but 40% is already our best deal!', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '2 days 21 hours', NOW() - INTERVAL '2 days 21 hours');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15558887777', v_mini_chatroom_number, 'Perfect! I''m looking at the premium bundle. What''s the total with discount?', 'sms', 'delivered', NOW() - INTERVAL '2 days 20 hours');

  INSERT INTO messages (
    user_id,
    user_real_number_id,
    type,
    phone_number,
    message_content,
    from_number,
    status,
    sent_at,
    created_at
  )
  VALUES
    (v_user_id, v_mini_chatroom_id, 'sms', '+15558887777', 'The premium bundle is normally $299. With SPRING40, you''ll pay just $179.40! That''s a savings of $119.60. Plus free shipping! 📦', v_mini_chatroom_number, 'sent', NOW() - INTERVAL '2 days 19 hours 55 minutes', NOW() - INTERVAL '2 days 19 hours 55 minutes');

  INSERT INTO inbound_messages (from_address, to_address, content, type, status, created_at)
  VALUES
    ('+15558887777', v_mini_chatroom_number, 'Wow that''s a great deal! Just placed my order. Order #12345. When will it ship?', 'sms', 'delivered', NOW() - INTERVAL '2 days 19 hours 30 minutes'),
    ('+15558887777', v_mini_chatroom_number, 'Also, do you have a tracking system?', 'sms', 'delivered', NOW() - INTERVAL '1 hour');

  -- Update unread count for this conversation
  UPDATE client_assignments SET unread_count = 2, last_message_at = NOW() - INTERVAL '1 hour' WHERE id = v_assignment4_id;

  RAISE NOTICE 'Successfully created 4 example conversations!';
  RAISE NOTICE 'Conversation 1: Sarah Johnson - Customer Service (Product Inquiry)';
  RAISE NOTICE 'Conversation 2: Michael Chen - Sales Follow-up (1 unread)';
  RAISE NOTICE 'Conversation 3: Jennifer Martinez - Support (Technical Issue Resolved)';
  RAISE NOTICE 'Conversation 4: David Thompson - Marketing Campaign (2 unread)';

END $$;

-- To use this migration:
-- 1. Find your test user's ID from the users table
-- 2. Find or create a mini-chatroom for that user
-- 3. Update the variables at the top of this migration
-- 4. Comment out or remove the safety check (the IF statement)
-- 5. Run the migration
-- 6. The conversations will appear in the Chatbox!
