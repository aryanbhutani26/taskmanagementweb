# Deployment Guide for Task Management System

## Prerequisites
1. GitHub account
2. Vercel account
3. Neon (PostgreSQL) account for database

## Step 1: Database Setup (Neon)

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string (it will look like: `postgresql://username:password@host/database?sslmode=require`)

## Step 2: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure as monorepo:
   - Root Directory: Leave empty (for monorepo)
   - Framework Preset: Next.js
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/.next`

### Option B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## Step 4: Environment Variables

### Backend Environment Variables (Set in Vercel)
```
DATABASE_URL=your_neon_postgresql_connection_string
JWT_ACCESS_SECRET=your-super-secret-access-key-here-make-it-long-and-random
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-make-it-different
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend Environment Variables (Set in Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.vercel.app
```

## Step 5: Database Migration

After deployment, run database migrations:
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Run migration
vercel env pull .env.local
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Step 6: Test Your Deployment

1. Visit your frontend URL
2. Try registering a new user
3. Test login functionality
4. Create and manage tasks

## Troubleshooting

### Common Issues:
1. **CORS errors**: Make sure FRONTEND_URL is set correctly in backend env vars
2. **Database connection**: Verify DATABASE_URL is correct and includes `?sslmode=require`
3. **API not found**: Check that API routes are properly configured
4. **Build failures**: Ensure all dependencies are in package.json

### Logs:
- Check Vercel function logs in the Vercel dashboard
- Use `vercel logs` command for real-time logs