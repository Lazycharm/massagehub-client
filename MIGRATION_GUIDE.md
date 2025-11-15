# MessageHub Database Migration Guide

**Created:** November 16, 2025  
**Purpose:** Complete database reset and migration for MessageHub

## 🎯 Overview

This guide walks you through resetting the Supabase database and applying the complete MessageHub schema.

---

## 📋 Migration Steps

### Step 1: Reset Database (Optional but Recommended)

If you have existing tables with issues, reset them first:

1. Open **Supabase SQL Editor**
2. Copy the entire content of `supabase-migrations/000_reset_database.sql`
3. Paste and **Run** in SQL Editor
4. Verify output shows: "Database reset complete!"

### Step 2: Create Complete Schema

1. Open **Supabase SQL Editor**
2. Copy the entire content of `supabase-migrations/001_complete_schema.sql`
3. Paste and **Run** in SQL Editor
4. Verify output shows success message with all 11 tables listed

### Step 3: Verify Tables Created

Run this query in SQL Editor to confirm all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_tokens',
  'user_chatrooms',
  'contacts',
  'groups',
  'group_members',
  'templates',
  'sender_numbers',
  'settings',
  'messages',
  'inbound_messages'
)
ORDER BY table_name;
```

You should see **10 tables** (users table is managed by Supabase Auth).

---

## 👤 Create Admin User

### Option 1: Via Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter email and password
4. Click **Create User**

### Option 2: Via Sign-Up (If Auth is enabled)

1. Go to your MessageHub app
2. Sign up with email/password
3. User will be created automatically

### Set User as Admin

After creating the user, run this SQL query (replace with your email):

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your@email.com';
```

Verify admin role:

```sql
SELECT id, email, role FROM users;
```

---

## 🔍 Verify Token System

Check that tokens were auto-created:

```sql
SELECT 
  u.email,
  ut.balance,
  ut.created_at
FROM users u
LEFT JOIN user_tokens ut ON u.id = ut.user_id;
```

All users should have **100 tokens**.

---

## 📊 Database Schema Summary

| Table | Purpose | RLS Enabled |
|-------|---------|-------------|
| `users` | Supabase Auth + role column | ✓ |
| `user_tokens` | Token/credit balance | ✓ |
| `user_chatrooms` | Multi-tenant chatroom access | ✓ |
| `contacts` | Contact management | ✓ |
| `groups` | Contact groups | ✓ |
| `group_members` | Group membership | ✓ |
| `templates` | SMS/Email templates | ✓ |
| `sender_numbers` | Available sender numbers | ✓ |
| `settings` | System settings | ✓ |
| `messages` | Outbound messages | ✓ |
| `inbound_messages` | Inbox messages | ✓ |

---

## 🔐 Row Level Security (RLS)

All tables have RLS policies configured:

### Admin Permissions
- **Full access** to all tables
- Can manage all users' data
- Can assign chatrooms to agents

### Agent Permissions
- **Own data only**: contacts, groups, templates, messages
- **Assigned chatrooms only**: can view inbound messages for assigned chatrooms
- Cannot view other agents' data

---

## 🚀 Next Steps After Migration

1. **Test Authentication**
   - Sign in with admin user
   - Verify role is 'admin'

2. **Test Token System**
   - Check user_tokens table has entries
   - Send a test message (should deduct 1 token)

3. **Deploy to Server**
   - Follow `DEPLOYMENT.md` for server setup
   - Ensure `.env.local` has correct Supabase credentials

4. **Assign Chatrooms** (Optional)
   - Create test chatroom assignment:
   ```sql
   INSERT INTO user_chatrooms (user_id, chatroom_id)
   VALUES (
     (SELECT id FROM users WHERE email = 'agent@test.com'),
     'test-chatroom-uuid'
   );
   ```

---

## ⚠️ Troubleshooting

### Error: "relation users does not exist"
- Supabase Auth not initialized
- Solution: Create a user via Supabase Dashboard first

### Error: "column users.role does not exist"
- Migration didn't run completely
- Solution: Re-run `001_complete_schema.sql`

### Token Balance Not Showing
- Check trigger exists:
  ```sql
  SELECT trigger_name FROM information_schema.triggers 
  WHERE event_object_table = 'users' 
  AND trigger_name = 'auto_initialize_user_tokens';
  ```

### RLS Blocking Access
- Verify user role:
  ```sql
  SELECT email, role FROM users WHERE id = auth.uid();
  ```

---

## 📁 Migration Files

```
supabase-migrations/
├── 000_reset_database.sql      # Drops all tables (use carefully!)
├── 001_complete_schema.sql     # Complete schema with all tables
└── (old files can be deleted)
    ├── 001_user_tokens.sql     # Replaced by 001_complete_schema.sql
    └── 002_user_chatrooms.sql  # Replaced by 001_complete_schema.sql
```

---

## ✅ Migration Checklist

- [ ] Run `000_reset_database.sql` (if needed)
- [ ] Run `001_complete_schema.sql`
- [ ] Verify 10 tables created
- [ ] Create admin user in Supabase Auth
- [ ] Update admin user role to 'admin'
- [ ] Verify tokens auto-created (100 per user)
- [ ] Test admin login
- [ ] Test RLS permissions
- [ ] Update `.env.local` on server
- [ ] Deploy application

---

## 🎉 Success Criteria

Migration is complete when:

✅ All 10 tables exist in Supabase  
✅ At least one admin user created  
✅ Admin user has `role = 'admin'`  
✅ All users have 100 tokens in `user_tokens`  
✅ RLS policies active on all tables  
✅ Can sign in to MessageHub as admin  
✅ Dashboard loads without errors  

---

**Need Help?** Check `DEPLOYMENT.md` for server deployment or `TROUBLESHOOTING.md` for common issues.
