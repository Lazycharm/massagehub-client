import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * Debug endpoint to check Chatbox setup for a user
 * GET /api/debug/chatbox-setup?user_email=user@example.com
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_email } = req.query;

    if (!user_email) {
      return res.status(400).json({ error: 'user_email parameter required' });
    }

    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('email', user_email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('\n=== CHATBOX SETUP DIAGNOSTIC ===');
    console.log('User:', user.email, '(', user.id, ')');

    // Check 1: User's chatroom assignments
    const { data: chatroomAssignments } = await supabaseAdmin
      .from('user_chatrooms')
      .select(`
        *,
        chatroom:chatrooms(id, name, provider, is_active)
      `)
      .eq('user_id', user.id);

    console.log('\n1. USER CHATROOM ASSIGNMENTS:', chatroomAssignments?.length || 0);
    chatroomAssignments?.forEach(assignment => {
      console.log('  - Chatroom:', assignment.chatroom?.name, '|', assignment.chatroom?.provider);
    });

    // Check 2: User's mini-chatrooms (phone lines)
    const { data: miniChatrooms, error: miniError } = await supabaseAdmin
      .from('user_real_numbers')
      .select(`
        *,
        chatroom:chatrooms!assigned_chatroom_id(id, name, provider, is_active)
      `)
      .eq('user_id', user.id);

    console.log('\n2. USER MINI-CHATROOMS (LINES):', miniChatrooms?.length || 0);
    if (miniError) {
      console.log('  ERROR:', miniError.message);
    }
    miniChatrooms?.forEach(mc => {
      console.log('  - Line:', mc.label || mc.real_number);
      console.log('    Real Number:', mc.real_number);
      console.log('    Provider:', mc.provider);
      console.log('    Active:', mc.is_active);
      console.log('    Assigned Chatroom ID:', mc.assigned_chatroom_id);
      console.log('    Chatroom Details:', mc.chatroom ? `${mc.chatroom.name} (${mc.chatroom.provider})` : 'NONE');
    });

    // Check 3: Client assignments for each mini-chatroom
    const { data: clientAssignments } = await supabaseAdmin
      .from('client_assignments')
      .select(`
        *,
        contact:contacts(name, phone, email),
        user_real_number:user_real_numbers(id, label, real_number)
      `)
      .in('user_real_number_id', miniChatrooms?.map(mc => mc.id) || []);

    console.log('\n3. CLIENT ASSIGNMENTS:', clientAssignments?.length || 0);
    const clientsByLine = {};
    clientAssignments?.forEach(ca => {
      const lineId = ca.user_real_number_id;
      if (!clientsByLine[lineId]) clientsByLine[lineId] = [];
      clientsByLine[lineId].push(ca);
    });

    Object.entries(clientsByLine).forEach(([lineId, clients]) => {
      const line = miniChatrooms?.find(mc => mc.id === lineId);
      console.log(`  - Line "${line?.label || line?.real_number}": ${clients.length} clients`);
    });

    // Check 4: Available chatrooms
    const { data: allChatrooms } = await supabaseAdmin
      .from('chatrooms')
      .select('id, name, provider, is_active')
      .eq('is_active', true);

    console.log('\n4. AVAILABLE ACTIVE CHATROOMS:', allChatrooms?.length || 0);
    allChatrooms?.forEach(cr => {
      console.log(`  - ${cr.name} (${cr.provider})`);
    });

    // Diagnose issues
    const issues = [];
    const fixes = [];

    if (!chatroomAssignments || chatroomAssignments.length === 0) {
      issues.push('User has NO chatroom assignments (user_chatrooms)');
      fixes.push('Admin needs to assign user to a chatroom in Admin → Chatroom Access');
    }

    if (!miniChatrooms || miniChatrooms.length === 0) {
      issues.push('User has NO mini-chatrooms (phone lines)');
      fixes.push('Admin needs to create mini-chatrooms in Admin → User Numbers');
    } else {
      const unassignedLines = miniChatrooms.filter(mc => !mc.assigned_chatroom_id);
      if (unassignedLines.length > 0) {
        issues.push(`${unassignedLines.length} mini-chatroom(s) have NO assigned_chatroom_id`);
        fixes.push('Admin needs to edit mini-chatrooms and select a chatroom in Admin → User Numbers');
      }

      const inactiveLines = miniChatrooms.filter(mc => !mc.is_active);
      if (inactiveLines.length > 0) {
        issues.push(`${inactiveLines.length} mini-chatroom(s) are INACTIVE`);
        fixes.push('Admin needs to activate mini-chatrooms in Admin → User Numbers');
      }
    }

    if (!clientAssignments || clientAssignments.length === 0) {
      issues.push('User has NO client assignments');
      fixes.push('User needs to import resources from Resources page, or admin assigns clients manually');
    }

    console.log('\n=== DIAGNOSTIC RESULT ===');
    if (issues.length === 0) {
      console.log('✅ All checks passed! Chatbox should work.');
    } else {
      console.log('❌ Issues found:');
      issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
      console.log('\n🔧 Suggested fixes:');
      fixes.forEach((fix, i) => console.log(`  ${i + 1}. ${fix}`));
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      chatroomAssignments: chatroomAssignments || [],
      miniChatrooms: miniChatrooms || [],
      clientAssignments: clientAssignments || [],
      availableChatrooms: allChatrooms || [],
      issues,
      fixes,
      status: issues.length === 0 ? 'ok' : 'issues_found'
    });
  } catch (error) {
    console.error('Chatbox setup diagnostic error:', error);
    return res.status(500).json({ error: error.message });
  }
}
