import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Notifications] Fetching for user:', user.id, 'role:', user.role);

    // Get admin notifications for this user
    let adminNotifications = [];
    try {
      const { data, error: adminNotifError } = await supabaseAdmin
        .from('admin_notifications')
        .select('*')
        .or(`target_user_id.eq.${user.id},target_role.eq.${user.role || 'user'}`)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (adminNotifError) {
        console.error('[Notifications] Error fetching admin notifications:', adminNotifError);
        // If table doesn't exist, continue without admin notifications
        if (adminNotifError.code !== '42P01') { // 42P01 = undefined_table
          throw adminNotifError;
        }
      } else {
        adminNotifications = data || [];
      }
    } catch (err) {
      console.error('[Notifications] Admin notifications table might not exist:', err);
    }

    console.log('[Notifications] Admin notifications:', adminNotifications?.length || 0);

    // Get user's chatrooms using admin client
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('user_chatrooms')
      .select('chatroom_id')
      .eq('user_id', user.id);

    if (assignError) {
      console.error('[Notifications] Error fetching assignments:', assignError);
    }

    console.log('[Notifications] User chatrooms:', assignments?.length || 0);

    // Get messages if user has chatrooms
    let messages = [];
    if (assignments && assignments.length > 0) {
      const chatroomIds = assignments.map(a => a.chatroom_id);

      // Get messages from the last 24 hours that aren't from the user
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('id, chatroom_id, sender, body, created_at, direction')
        .in('chatroom_id', chatroomIds)
        .eq('direction', 'inbound') // Only inbound messages (from customers)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[Notifications] Error fetching messages:', error);
      } else {
        messages = data || [];
      }

      console.log('[Notifications] Found messages:', messages.length);
    }

    // If no chatrooms, no messages, and no admin notifications, return empty
    if (messages.length === 0 && adminNotifications.length === 0) {
      console.log('[Notifications] No notifications to return');
      return res.status(200).json({ count: 0, notifications: [] });
    }

    // Format message notifications
    const messageNotifications = (messages || []).map(msg => ({
      id: msg.id,
      chatroom_id: msg.chatroom_id,
      type: 'new_message',
      title: 'New Message',
      message: `From ${msg.sender}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`,
      timestamp: msg.created_at,
      read: false
    }));

    // Format admin notifications
    const formattedAdminNotifications = (adminNotifications || []).map(notif => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      timestamp: notif.created_at,
      read: notif.is_read,
      isAdminNotification: true
    }));

    // Combine and sort by timestamp
    const allNotifications = [...formattedAdminNotifications, ...messageNotifications]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('[Notifications] Returning', allNotifications.length, 'notifications');

    return res.status(200).json({
      count: allNotifications.length,
      notifications: allNotifications
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
