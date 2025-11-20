# 📱 MessageHub - Multi-Provider Communication Platform

A modern, full-featured messaging platform supporting multiple providers (Twilio, Infobip, and more) with role-based access control, resource management, and a beautiful UI.

## ✨ Features

- 🔐 **Role-Based Access Control** - Admin and agent roles with granular permissions
- 📱 **Multi-Provider Support** - Twilio, Infobip, Base44, and extensible architecture
- 💬 **Unified Inbox** - Manage all conversations from one interface
- 👥 **Contact Management** - Import and organize contacts efficiently
- 📊 **Resource Pool** - Admin-managed contact resources with assignment system
- 🎨 **Modern UI** - Built with Next.js, Tailwind CSS, and shadcn/ui components
- 📧 **Multi-Channel** - SMS, WhatsApp, Email support (provider-dependent)
- 🔄 **Real-time Updates** - Live message synchronization
- 📈 **Analytics Ready** - Message tracking and quota management
- 📝 **Templates** - Pre-built message templates for quick sending

## 📁 Project Structure

```
messagehub/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── admin/          # Admin-specific components
│   ├── chatrooms/      # Chatroom components
│   ├── contacts/       # Contact management
│   ├── groups/         # Group management
│   ├── inbox/          # Inbox/messaging components
│   └── templates/      # Message templates
├── lib/                # Utility libraries
│   ├── api.js         # API client functions
│   ├── authMiddleware.js  # Authentication helpers
│   └── supabaseClient.js  # Supabase client setup
├── pages/              # Next.js pages and API routes
│   ├── api/           # API endpoints
│   ├── admin/         # Admin pages
│   └── ...            # User-facing pages
├── styles/            # Global styles
├── supabase-migrations/  # Database migration files
└── public/            # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account
- API credentials for at least one messaging provider (Twilio or Infobip)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Lazycharm/messagehub.git
cd messagehub
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Infobip Configuration (Optional)
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=your_infobip_base_url

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run database migrations:**

Open your Supabase SQL Editor and run the migrations from the `supabase-migrations` folder in order:
- `013_add_user_id_to_messages.sql`
- `014_fix_message_counts_trigger.sql`  
- `015_rename_twilio_number_column.sql`

5. **Start the development server:**
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### First Time Setup

1. Create an admin account via the signup page
2. Manually set your user role to `admin` in the Supabase `users` table
3. Log in and configure your messaging providers in **Admin → API Providers**
4. Add sender numbers in **Admin → Sender Numbers**
5. Create chatrooms and assign users in **Admin → Chatrooms**

## 📡 Key API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Chatrooms
- `GET /api/user-chatrooms/my-chatrooms` - Get user's assigned chatrooms
- `GET /api/chatrooms/[id]/contacts` - Get chatroom contacts
- `GET /api/contacts/[id]/messages` - Get contact message history

### Messaging
- `POST /api/messages/send` - Send SMS/message via configured provider
- `POST /api/messages/inbound` - Webhook for incoming messages

### Admin
- `GET /api/admin/chatrooms` - Manage chatrooms
- `GET /api/providers` - Manage API providers
- `GET /api/sender-numbers` - Manage sender numbers
- `GET /api/resource-pool` - Manage contact resources

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

## 🗄️ Database Schema

Key tables:
- `users` - User accounts with role-based access
- `chatrooms` - Messaging channels with provider configuration
- `sender_numbers` - Phone/email/WhatsApp identifiers
- `api_providers` - Provider credentials (Twilio, Infobip, etc.)
- `contacts` - User-specific contact list
- `messages` - All sent/received messages
- `resource_pool` - Admin-managed contact resources
- `user_chatrooms` - User-to-chatroom assignments
- `user_tokens` - User message credits/quota
- `templates` - Message templates

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🎯 User Workflow

### For Admins:
1. Configure API providers (Twilio, Infobip)
2. Add sender numbers (phone numbers, emails)
3. Create chatrooms and link to providers
4. Assign users to chatrooms
5. Manage resource pool
6. Monitor message logs

### For Agents:
1. Import assigned resources to your chatroom
2. View contacts in Inbox
3. Send and receive messages
4. Use templates for quick responses
5. Organize contacts into groups

## 🔧 Configuration

### Adding a New Messaging Provider

1. Go to **Admin → API Providers**
2. Click **Add Provider**
3. Fill in provider details:
   - Provider name
   - Provider type (SMS, Email, WhatsApp)
   - API credentials
4. Test connection
5. Save

### Creating a Chatroom

1. Go to **Admin → Chatrooms**
2. Click **Create Chatroom**
3. Configure:
   - Chatroom name
   - Select sender number
   - Choose provider
   - Set as active
4. Assign users in **Admin → Chatroom Access**

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **State Management**: React Query (TanStack Query)
- **UI Components**: shadcn/ui, Radix UI
- **Icons**: Lucide React

## 📖 Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture and design decisions
- [API Documentation](./API_DOCUMENTATION.md) - Detailed API reference
- [Vercel Deployment](./VERCEL_DEPLOYMENT_GUIDE.md) - Deployment instructions
- [Quick Start Guide](./QUICK_START.md) - Getting started guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/Lazycharm/messagehub/issues)
- Check existing documentation

## 🎉 Changelog

### v1.0.0 (Current)
- ✅ Multi-provider messaging support (Twilio, Infobip)
- ✅ Role-based access control (Admin/Agent)
- ✅ Resource pool management
- ✅ Unified inbox with real-time updates
- ✅ Contact and group management
- ✅ Message templates
- ✅ Admin dashboard with analytics
- ✅ CSV import/export
- ✅ Message quota system

---

**Built with ❤️ using Next.js, React, and Supabase**

