# 🚀 Migrations to Run - Fix Message Storage

## Problem
Messages are sending successfully via Infobip but failing to store in the database with error:
```
relation "client_assignments" does not exist
```

Additionally, code was still referencing the old `twilio_number` column which was renamed to `sender_number`.

## Root Cause
1. The `update_message_counts` trigger function references the old `client_assignments` table that was removed
2. API files were still querying `twilio_number` column after migration 015 renamed it to `sender_number`

## Solution - Run These Migrations in Order

### ✅ COMPLETED: Migration 015 (Already Run)
Column renamed from `twilio_number` → `sender_number` and spaces removed from phone numbers.

### ✅ COMPLETED: Code Updates (Already Done)
All API files and components updated to use `sender_number`:
- `/api/user-chatrooms/my-chatrooms.js`
- `/api/user-chatrooms/index.js` 
- `/api/messages/send.js`
- `/api/messages/inbound/index.js`
- `/api/chatrooms/index.js`
- `/api/admin/chatrooms.js`
- `/pages/admin/AdminChatrooms.js`
- `/pages/admin/AdminChatroomAccess.js`
- `/components/chatrooms/ChatRoomSidebar.jsx`

### Migration 014: Fix Message Counts Trigger ⚠️ RUN THIS NOW
**File:** `supabase-migrations/014_fix_message_counts_trigger.sql`

**What it does:**
- Removes references to deleted `client_assignments` and `user_real_numbers` tables from trigger
- Simplifies trigger to only update `user_quotas` table
- Allows messages to be stored without old table dependencies

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `014_fix_message_counts_trigger.sql`
3. Paste and click **RUN**
4. Should see: `✅ Migration 014 complete!`

---

## Testing After Migrations

1. **Send a test message** via Inbox at `http://localhost:3000/Inbox`
2. **Check terminal logs** - should see:
   ```
   [Send Message] Infobip message sent: 4636XXXXXXXXXXXXX
   [Send Message] Message stored successfully: <uuid>
   ```
3. **Verify in Inbox** - message should now appear in the chat window
4. **Check database** - Query messages table to confirm user_id is populated:
   ```sql
   SELECT id, content, user_id, chatroom_id, created_at 
   FROM messages 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## What Was Already Fixed

✅ Migration 013 - Added `user_id` column to messages table with RLS policies  
✅ Updated `send.js` - Stores `user_id` with each message  
✅ Infobip Integration - Messages sending successfully (confirmed with message IDs)  
✅ Code Updated - Handles both `sender_number` and `twilio_number` column names  

## Expected Results

After running migration 014:
- ✅ Messages send via Infobip
- ✅ Messages store in database with user_id
- ✅ Messages display in Inbox
- ✅ No more `client_assignments` errors

## If You Still See Issues

Check for any other triggers referencing old tables:
```sql
-- List all triggers on messages table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'messages';

-- List all functions that might reference client_assignments
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_definition LIKE '%client_assignments%';
```
