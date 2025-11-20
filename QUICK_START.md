# MessageHub - Quick Start Checklist

## ✅ Complete Setup in 15 Minutes

### Step 1: Apply Database Migration (3 min)
1. Open https://supabase.com/dashboard
2. Select your MessageHub project
3. Click **SQL Editor** → **New Query**
4. Open `supabase-migrations/005_complete_schema_fix.sql`
5. Copy entire file (Ctrl+A, Ctrl+C)
6. Paste into SQL Editor
7. Click **Run** (or Ctrl+Enter)
8. Wait for: "SCHEMA FIX COMPLETED! ✅"

**Verify:**
- Check output shows: "All 49 API endpoints fully supported!"
- No error messages

---

### Step 2: Configure Environment (2 min)
1. Open `.env.local` in your project
2. Go to Supabase Dashboard → **Settings** → **API**
3. Copy these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

4. Save file (Ctrl+S)

**Optional - Add Twilio (skip if testing only):**
```env
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxxx
```

---

### Step 3: Test Locally (5 min)

**Start Server:**
```powershell
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

**Quick Test:**
1. Open http://localhost:3000
2. Go to Signup → Create account
3. Go to Login → Login with new account
4. Dashboard should load ✅

**Check Console:**
- No red errors ✅
- "✅ SUPABASE_SERVICE_ROLE_KEY loaded" message appears ✅

---

### Step 4: Create Admin User (2 min)

**In Supabase SQL Editor:**
```sql
-- Make your test user an admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

**Refresh your browser** → You now have admin access!

---

### Step 5: Deploy to Vercel (3 min)

**Login:**
```powershell
vercel login
```

**Deploy:**
```powershell
vercel --prod
```

**Add Environment Variables:**
1. Go to https://vercel.com/dashboard
2. Select **messagehub** project
3. Click **Settings** → **Environment Variables**
4. Add same 3 variables from `.env.local`
5. Select: **Production, Preview, Development**
6. Click **Save**

**Redeploy:**
```powershell
vercel --prod
```

---

## 🎯 Core Features to Test

### 1. Authentication ✅
- [ ] Signup creates user + token
- [ ] Login redirects to dashboard
- [ ] Logout clears session

### 2. Contacts ✅
- [ ] Can create contact
- [ ] Can view contacts list
- [ ] Can edit/delete contact

### 3. Messages ✅
- [ ] Can view messages (if any exist)
- [ ] Token balance shows correctly
- [ ] (Optional) Send SMS if Twilio configured

### 4. Admin Features ✅
- [ ] Can create chatroom
- [ ] Can assign users to chatrooms
- [ ] Can approve users
- [ ] Can manage settings

---

## 🔍 Verify Database Schema

**Run in Supabase SQL Editor:**
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 11 tables
-- chatrooms, contacts, group_members, groups, inbound_messages,
-- messages, sender_numbers, settings, templates, user_chatrooms, 
-- user_tokens, users

-- Check messages table has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('twilio_message_sid', 'status');

-- Expected: 2 rows (both columns exist)

-- Check users table has all columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('full_name', 'password_hash', 'is_approved', 'approved_by', 'approved_at');

-- Expected: 5 rows (all columns exist)
```

---

## 📊 All 49 API Endpoints

### Authentication (3)
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Users (9)
- GET /api/users
- POST /api/users
- GET /api/users/{id}
- PATCH /api/users/{id}
- DELETE /api/users/{id}
- GET /api/admin/users
- POST /api/admin/users
- POST /api/admin/users/approve
- POST /api/admin/users/regenerate-token

### Messages (3)
- GET /api/messages
- POST /api/messages/send
- POST /api/messages/inbound

### Contacts (4)
- GET /api/contacts
- POST /api/contacts
- PATCH /api/contacts/{id}
- DELETE /api/contacts/{id}

### Chatrooms (4)
- GET /api/chatrooms
- POST /api/chatrooms
- POST /api/chatrooms/import-csv
- PATCH /api/chatrooms/{id}/contacts

### User-Chatrooms (3)
- GET /api/user-chatrooms
- POST /api/user-chatrooms
- DELETE /api/user-chatrooms

### Groups (6)
- GET /api/groups
- POST /api/groups
- GET /api/groups/{id}
- PATCH /api/groups/{id}
- DELETE /api/groups/{id}
- POST /api/groups/{id}/members
- DELETE /api/groups/{id}/members

### Templates (5)
- GET /api/templates
- POST /api/templates
- GET /api/templates/{id}
- PATCH /api/templates/{id}
- DELETE /api/templates/{id}

### Sender Numbers (4)
- GET /api/sender-numbers
- POST /api/sender-numbers
- PATCH /api/sender-numbers/{id}
- DELETE /api/sender-numbers/{id}

### Settings (4)
- GET /api/settings
- POST /api/settings
- PATCH /api/settings/{id}
- DELETE /api/settings/{id}

### Tokens (3)
- GET /api/tokens/get
- GET /api/tokens/list
- POST /api/tokens/update

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
→ Check `.env.local` exists and has all 3 variables

### "Failed to fetch" errors
→ Verify Supabase URL and anon key are correct

### "Column does not exist: twilio_message_sid"
→ Run migration 005 again, verify completion message

### Send SMS fails
→ Normal if Twilio not configured, add credentials to test

### Login redirects to login page
→ Check cookie is set (F12 → Application → Cookies)

### Admin features not showing
→ Update user role to 'admin' in Supabase

---

## 📚 Full Documentation

- **API_DATABASE_AUDIT.md** - Complete API & table reference
- **TESTING_GUIDE.md** - 20 detailed test cases
- **DEPLOYMENT_STEPS.md** - Full deployment walkthrough
- **DATABASE_OPTIMIZATION.md** - Schema optimization details

---

## ✅ Success Criteria

Your project is ready when:
- [ ] Migration 005 applied successfully
- [ ] All 3 environment variables configured
- [ ] Local server starts without errors
- [ ] Can signup and login
- [ ] Dashboard displays user info
- [ ] Can create contacts
- [ ] Admin user has full access
- [ ] Deployed to Vercel (production URL works)

---

**Estimated Total Time: 15 minutes**
**Status: 100% Backend-Frontend Alignment ✅**
**All 49 APIs Functional ✅**
