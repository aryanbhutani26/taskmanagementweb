# Vercel Environment Variables Setup

## Go to your Vercel Dashboard:
https://vercel.com/aryan-bhutanis-projects/task-management-app/settings/environment-variables

## Add these EXACT environment variables:

### For Production Environment:

**Key:** `DATABASE_URL`
**Value:** `postgresql://neondb_owner:npg_A2VFMjs9gBhm@ep-ancient-meadow-ahbjnjaz-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
**Environment:** Production

**Key:** `JWT_ACCESS_SECRET`
**Value:** `550c4a80318877697e5b1db1c91c2a4fb9cb205349cc54e39dffa64fbe1915db`
**Environment:** Production

**Key:** `JWT_REFRESH_SECRET`
**Value:** `4a67affc6f8fae969a88e2434c3391cd272d9c5da4ec4e898a8dce0be6386355`
**Environment:** Production

**Key:** `JWT_ACCESS_EXPIRES_IN`
**Value:** `15m`
**Environment:** Production

**Key:** `JWT_REFRESH_EXPIRES_IN`
**Value:** `7d`
**Environment:** Production

**Key:** `NODE_ENV`
**Value:** `production`
**Environment:** Production

**Key:** `FRONTEND_URL`
**Value:** `https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app`
**Environment:** Production

**Key:** `NEXT_PUBLIC_API_URL`
**Value:** `https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app`
**Environment:** Production

## IMPORTANT:
- Make sure `NEXT_PUBLIC_API_URL` is set to your Vercel domain (NOT localhost)
- All environment variables should be set for "Production" environment
- After adding all variables, redeploy your application