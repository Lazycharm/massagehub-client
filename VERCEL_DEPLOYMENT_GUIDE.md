# Vercel Deployment Guide for MessageHub

## ✅ Backup Created
Your project has been backed up to: `c:\messagehub_backup_20251119_204900`

## 🚀 Quick Deployment Steps

### 1. Login to Vercel
```powershell
vercel login
```
This will open your browser to authenticate with GitHub, GitLab, or email.

### 2. Deploy the Project
```powershell
cd c:\messagehub
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No
- **Project name?** → messagehub (or your preferred name)
- **Directory?** → ./ (press Enter)
- **Override settings?** → No

### 3. Set Environment Variables

After deployment, you need to add your Supabase credentials:

```powershell
# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Or add them via the Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 4. Redeploy with Environment Variables
```powershell
vercel --prod
```

## 📋 Environment Variables Needed

Copy these from your Supabase dashboard (https://supabase.com/dashboard):

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Location: Project Settings → API → Project URL
   - Example: `https://xxxxxxxxxxxxx.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Location: Project Settings → API → Project API keys → anon public
   - Safe to expose to the browser

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Location: Project Settings → API → Project API keys → service_role
   - ⚠️ Keep this secret! Only use server-side

## 🌐 Your Deployment URLs

After deployment, Vercel will give you:
- **Preview URL**: `https://messagehub-xxxxxx.vercel.app` (for testing)
- **Production URL**: `https://messagehub.vercel.app` (or your custom domain)

## 🔄 Future Deployments

### Deploy from Git (Recommended)
1. Push your code to GitHub
2. Connect Vercel to your GitHub repo
3. Automatic deployments on every push!

```powershell
# If you haven't initialized git yet
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/messagehub.git
git push -u origin main
```

### Manual Deployments
```powershell
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🎨 Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as shown
4. Vercel handles SSL automatically!

## 🐛 Troubleshooting

### Build Fails
- Check environment variables are set
- Make sure Supabase credentials are correct
- Check build logs in Vercel dashboard

### 502 Bad Gateway
- Environment variables might be missing
- Check server-side code in API routes

### Can't Access Admin Features
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check admin user exists in Supabase

## 📊 Monitoring

Vercel provides:
- Real-time analytics
- Performance metrics
- Error tracking
- Deployment logs

Access at: https://vercel.com/dashboard

## 💰 Pricing

**Hobby (Free) Plan includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Edge network
- Preview deployments

**Perfect for this project!** 🎉

## 🔐 Security Notes

1. Never commit `.env.local` to Git
2. Use Vercel's environment variables feature
3. Rotate service role key if exposed
4. Enable Vercel's password protection for staging

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Next.js Docs: https://nextjs.org/docs

---

**Ready to deploy?** Run: `vercel`
