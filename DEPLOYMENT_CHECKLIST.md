# Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.local` (or `.env.production` on server)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` to your Supabase project URL
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Supabase anon key
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` to your Supabase service role key
- [ ] Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- [ ] Set `INFOBIP_API_KEY` and `INFOBIP_BASE_URL` (if using Infobip)
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://www.messagehub.space/`)

### 2. Database Setup
Run these migrations in order on your Supabase database:

```bash
# Run migrations in SQL editor
1. 001_complete_schema.sql
2. 016_add_contacts_favorite_field.sql
3. 017_add_contact_source_field.sql
```

**Important:** Migration 018 is for reference only - it documents the complete schema but should NOT be run on an existing database.

### 3. Twilio Webhook Configuration
Configure these webhooks in your Twilio Console:

**For each phone number:**
- Inbound Messages Webhook: `https://your-domain.com/api/messages/inbound` (HTTP POST)

**For Messaging Service:**
- Status Callback URL: `https://your-domain.com/api/messages/status-callback` (HTTP POST)
- Request URL: `https://your-domain.com/api/messages/inbound` (HTTP POST)

### 4. Build and Deploy

#### Vercel Deployment:
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Manual Deployment:
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm start
```

### 5. Post-Deployment Verification

- [ ] Test webhook accessibility: `https://your-domain.com/api/messages/inbound?test=true`
- [ ] Send a test SMS from Twilio dashboard - verify it appears in Inbox
- [ ] Send an outbound SMS - verify delivery status updates
- [ ] Check Dashboard displays correct statistics
- [ ] Verify Admin Settings are accessible
- [ ] Test contact import from Resources
- [ ] Verify chatroom assignment works

### 6. Security Checklist

- [ ] `.env.local` is in `.gitignore` and NOT committed to git
- [ ] All API keys are set as environment variables (not hardcoded)
- [ ] Supabase RLS policies are enabled
- [ ] Only necessary endpoints are public
- [ ] CORS is properly configured
- [ ] Rate limiting is in place (if applicable)

## Troubleshooting

### Inbound Messages Not Appearing
1. Check webhook URL is correct in Twilio
2. Verify webhook endpoint returns 200: `curl -X POST https://your-domain.com/api/messages/inbound?test=true`
3. Check terminal logs for `[Inbound Webhook]` messages
4. Verify chatroom `sender_number` matches Twilio phone number exactly

### Status Not Updating to "Delivered"
1. Verify status callback URL in Twilio Messaging Service: should be `/api/messages/status-callback` (not `/status`)
2. Check Twilio logs for webhook delivery failures
3. Verify messages table has `twilio_message_sid` column populated

### Dashboard Showing 0s
1. Verify `/api/user/stats` endpoint is accessible
2. Check browser console for API errors
3. Verify user has chatrooms assigned
4. Check Supabase logs for RLS policy errors

## Additional Resources

- [Twilio Webhooks Documentation](https://www.twilio.com/docs/usage/webhooks)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
