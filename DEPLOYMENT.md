# Deployment Guide

## Setting Up Environment Variables for Deployment

Your app requires the `VITE_GROQ_API_KEY` environment variable to work. This needs to be configured in your deployment platform, not just in a local `.env` file.

### For Vercel

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Name**: `VITE_GROQ_API_KEY`
   - **Value**: Your Groq API key (starts with `gsk_...`)
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**
7. **Redeploy** your application (go to Deployments → click the three dots → Redeploy)

### For Netlify

1. Go to your site on [Netlify Dashboard](https://app.netlify.com)
2. Go to **Site configuration** → **Environment variables**
3. Click **Add a variable**
4. Add:
   - **Key**: `VITE_GROQ_API_KEY`
   - **Value**: Your Groq API key (starts with `gsk_...`)
   - **Scopes**: Select all (Production, Deploy previews, Branch deploys)
5. Click **Save**
6. **Trigger a new deploy** (go to Deploys → Trigger deploy → Deploy site)

### For Render

1. Go to your service on [Render Dashboard](https://dashboard.render.com)
2. Click on your service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `VITE_GROQ_API_KEY`
   - **Value**: Your Groq API key (starts with `gsk_...`)
6. Click **Save Changes**
7. The service will automatically redeploy

### For GitHub Pages / Other Static Hosting

For static hosting platforms that don't support environment variables, you have two options:

**Option 1: Use a build-time script** (Recommended)
- Set the environment variable when building: `VITE_GROQ_API_KEY=your_key npm run build`
- The variable will be baked into the build

**Option 2: Use a backend proxy** (More secure)
- Create a simple backend API that stores the key server-side
- Have your frontend call your backend API instead of directly calling Groq

### Important Notes

- ⚠️ **Never commit your `.env` file to git** - it's already in `.gitignore`
- ✅ The variable name **must** start with `VITE_` for Vite to expose it to the client
- ✅ After adding the environment variable, you **must redeploy** for changes to take effect
- ✅ The environment variable is embedded at build time, so it's included in the built files

### Verifying It Works

After deployment, the app should work without asking for the API key. If you still see errors:
1. Double-check the variable name is exactly `VITE_GROQ_API_KEY`
2. Make sure you redeployed after adding the variable
3. Check the build logs to ensure the variable was available during build
