# 🚀 Migrations to Run

## Latest Migrations

### Migration 018: Complete Current Schema ✅ REFERENCE ONLY
**File:** `supabase-migrations/018_complete_current_schema.sql`

**What it does:**
- Complete schema definition for the current MessageHub database
- Includes all tables, constraints, indexes, and foreign keys
- Use this as a reference or to set up a fresh database
- **DO NOT run on existing database** (will create duplicate tables)

**Purpose:**
This file represents the complete current state of your database schema for documentation and fresh installations.

---

### Migration 017: Add Contact Source Tracking ⚠️ RUN THIS NOW
**File:** `supabase-migrations/017_add_contact_source_field.sql`

**What it does:**
- Adds `added_via` column to `contacts` table to distinguish between:
  - `'manual'` - Contacts added via "Add Contact" button (Start Chat)
  - `'import'` - Contacts imported from resource pool
- Updates existing contacts to be marked as 'import' (legacy behavior)
- New contacts default to 'manual' when added via UI

**Why it's needed:**
The Chatroom page should only display contacts that were manually added via "Start Chat", not all imported resources. This field allows filtering.

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `017_add_contact_source_field.sql`
3. Paste and click **RUN**
4. Should see: Success message

**After running:** The Chatroom contacts list will only show contacts added via the "Add Contact" button.

---

### Migration 016: Add Contacts Favorite Field ⚠️ RUN THIS
**File:** `supabase-migrations/016_add_contacts_favorite_field.sql`

**What it does:**
- Adds `is_favorite` boolean field to contacts table
- Allows users to mark contacts as favorites
- Favorites are sorted to the top of contact lists

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `016_add_contacts_favorite_field.sql`
3. Paste and click **RUN**

---

## Previously Completed Migrations

### ✅ Migration 015: Rename twilio_number Column (Already Run)
Column renamed from `twilio_number` → `sender_number` and spaces removed from phone numbers.

### ✅ Migration 014: Fix Message Counts Trigger (Already Run)
