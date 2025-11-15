# MessageHub API Documentation

## Overview
This document describes all available API routes in the MessageHub application. All routes use Supabase as the database backend.

## Base URL
- **Local Development**: `http://localhost:3000/api`
- **Production**: `https://messagehub.space/api`

---

## 🏠 Chatrooms API

### GET /api/chatrooms
Fetch all chatrooms ordered by creation date.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Customer Support",
    "twilio_number": "+1234567890",
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

### POST /api/chatrooms
Create a new chatroom.

**Request Body**:
```json
{
  "name": "Customer Support",
  "twilio_number": "+1234567890"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "name": "Customer Support",
  "twilio_number": "+1234567890",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Errors**:
- `400` - Missing required fields
- `500` - Database error

---

## 👥 Contacts API

### PATCH /api/chatrooms/[id]/contacts
Assign multiple contacts to a specific chatroom.

**URL Params**: 
- `id` - Chatroom UUID

**Request Body**:
```json
{
  "contacts": [
    {
      "name": "John Doe",
      "phone_number": "+1234567890",
      "email": "john@example.com",
      "tags": ["vip", "customer"]
    }
  ]
}
```

**Response**: `200 OK`
```json
{
  "message": "Contacts added successfully",
  "added": 5,
  "skipped": 2,
  "contacts": [...],
  "skipped_details": [...]
}
```

**Features**:
- Automatically validates phone numbers
- Prevents duplicate contacts in the same chatroom
- Sets default name to "Unknown" if not provided
- Tracks skipped contacts with reasons

**Errors**:
- `400` - Invalid data or no valid contacts
- `404` - Chatroom not found
- `500` - Database error

---

## 📤 CSV Import API

### POST /api/chatrooms/import-csv
Bulk import contacts from CSV file.

**Request**: `multipart/form-data`
- `file` - CSV file with columns: name, phone_number, email, tags
- `chatroomId` - UUID of the chatroom

**CSV Format**:
```csv
name,phone_number,email,tags
John Doe,+1234567890,john@example.com,"vip,customer"
Jane Smith,+0987654321,jane@example.com,
```

**Response**: `200 OK`
```json
{
  "message": "Contacts imported successfully",
  "imported": 48,
  "skipped": 2,
  "total_rows": 50,
  "contacts": [...],
  "skipped_details": [...]
}
```

**Features**:
- Handles large CSV files
- Prevents duplicates within same CSV and against existing contacts
- Auto-creates contacts with "Unknown" name if missing
- Validates phone numbers
- Cleans up temporary files automatically

**Errors**:
- `400` - Missing file or chatroom ID
- `404` - Chatroom not found
- `500` - Database error

---

## 📨 Messages API

### POST /api/messages/send
Send outbound SMS via Twilio.

**Request Body**:
```json
{
  "chatroom_id": "uuid",
  "to_number": "+1234567890",
  "content": "Hello from MessageHub!"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "twilio_sid": "SM...",
  "data": {
    "id": "uuid",
    "from_number": "+0987654321",
    "to_number": "+1234567890",
    "content": "Hello from MessageHub!",
    "type": "sms",
    "chatroom_id": "uuid",
    "twilio_message_sid": "SM...",
    "status": "queued",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

**Features**:
- Validates chatroom exists and has Twilio number
- Sends SMS via Twilio API
- Stores message in database for tracking
- Returns Twilio message SID for status tracking

**Errors**:
- `400` - Missing fields or Twilio error
- `404` - Chatroom not found
- `500` - SMS service not configured or database error

**Requirements**:
- Environment variables must be set:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`

---

## 📥 Inbound Messages API

### POST /api/messages/inbound
Twilio webhook endpoint for receiving SMS.

**Request Body** (Twilio format, form-urlencoded):
```
From=+1234567890
To=+0987654321
Body=Customer reply message
```

**Response**: `200 OK` (TwiML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Features**:
- Matches incoming number to chatroom by `twilio_number`
- Auto-creates contact if sender is unknown
- Stores message in both `inbound_messages` and `messages` tables
- Triggers real-time updates via Supabase

**Errors**:
- `400` - Missing required Twilio parameters
- `404` - No chatroom found for Twilio number
- `500` - Database error

### GET /api/messages/inbound
Fetch all inbound messages (admin/testing).

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "from_number": "+1234567890",
    "content": "Customer message",
    "chatroom_id": "uuid",
    "chatrooms": {
      "name": "Customer Support",
      "twilio_number": "+0987654321"
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

---

## 🔧 Base44 Client

The `base44Client` provides a unified API interface for all frontend components.

### Usage Example

```javascript
import { base44 } from '@/src/api/base44Client';

// Fetch all chatrooms
const chatrooms = await base44.entities.Chatroom.list();

// Create a new chatroom
const chatroom = await base44.entities.Chatroom.create({
  name: "Sales Team",
  twilio_number: "+1234567890"
});

// Assign contacts to chatroom
await base44.entities.Chatroom.assignContacts(chatroomId, [
  { name: "John", phone_number: "+1111111111" }
]);

// Import CSV
const file = event.target.files[0];
await base44.entities.Chatroom.importCSV(chatroomId, file);

// Send SMS
await base44.entities.Message.send({
  chatroom_id: chatroomId,
  to_number: "+1234567890",
  content: "Hello!"
});

// List messages for a chatroom
const messages = await base44.entities.Message.list({ 
  chatroom_id: chatroomId 
});
```

### Available Entities

- **Chatroom**: `list()`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `assignContacts(id, contacts)`, `importCSV(id, file)`
- **Contact**: `list(params)`, `create(data)`, `update(id, data)`, `delete(id)`
- **Message**: `list(params)`, `send(data)`
- **InboundMessage**: `list(params)`
- **Group**: `list()`, `create(data)`, `update(id, data)`, `delete(id)`
- **Template**: `list()`, `create(data)`, `update(id, data)`, `delete(id)`

---

## 🔐 Environment Variables

Required for production deployment:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twilio Configuration (Required for SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
```

---

## 🗄️ Database Schema

### chatrooms
- `id` (uuid, primary key)
- `name` (text, required)
- `twilio_number` (text, required, unique)
- `created_at` (timestamp)

### contacts
- `id` (uuid, primary key)
- `name` (text, default: "Unknown")
- `phone_number` (text, required)
- `email` (text, optional)
- `tags` (text[], optional)
- `chatroom_id` (uuid, foreign key → chatrooms.id)
- `created_at` (timestamp)

### messages
- `id` (uuid, primary key)
- `from_number` (text, required)
- `to_number` (text, required)
- `content` (text, required)
- `type` (text, default: "sms")
- `read` (boolean, default: false)
- `chatroom_id` (uuid, foreign key → chatrooms.id)
- `twilio_message_sid` (text, optional)
- `status` (text, optional)
- `created_at` (timestamp)

### inbound_messages
- `id` (uuid, primary key)
- `from_number` (text, required)
- `content` (text, required)
- `chatroom_id` (uuid, foreign key → chatrooms.id)
- `created_at` (timestamp)

---

## 🚀 Deployment

### Local Development
```bash
npm install
npm run dev
```

### Production Deployment
```bash
# On VPS (89.116.33.117)
cd /var/www/massagehub-client
git pull origin main
npm install
npm run build
pm2 restart messagehub-client
```

### Nginx Configuration
```nginx
server {
    server_name messagehub.space;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Real-time Updates

All tables support Supabase real-time subscriptions. Example:

```javascript
import { supabase } from '@/lib/supabaseClient';

// Subscribe to new messages
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `chatroom_id=eq.${chatroomId}`
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

## 🔍 Testing

### Test Twilio Webhook Locally
```bash
# Install ngrok
ngrok http 3000

# Update Twilio webhook URL to:
https://your-ngrok-url.ngrok.io/api/messages/inbound
```

### Test SMS Sending
```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "chatroom_id": "uuid",
    "to_number": "+1234567890",
    "content": "Test message"
  }'
```

---

## 📝 Notes

- All phone numbers should include country code (e.g., +1234567890)
- CSV import handles up to thousands of contacts efficiently
- Duplicate detection is based on `phone_number + chatroom_id` combination
- Twilio webhook expects form-urlencoded data, not JSON
- All API routes return JSON except Twilio webhook (returns TwiML)

---

## 🆘 Troubleshooting

### "SMS service not configured"
- Ensure `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set in `.env.local`
- Restart the development server after adding environment variables

### "Chatroom not found for this Twilio number"
- Ensure chatroom exists with matching `twilio_number`
- Verify Twilio webhook is configured with correct URL

### CSV import fails
- Check CSV has required `phone_number` column
- Ensure file is properly formatted UTF-8
- Verify chatroom ID is valid UUID

### Real-time not working
- Verify Supabase Realtime is enabled for tables
- Check subscription filter matches expected data
- Ensure client is connected before insert/update occurs
