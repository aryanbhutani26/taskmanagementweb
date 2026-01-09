# Deployment Checklist ✅

## Pre-Deployment Setup

### 1. Database Setup
- [ ] Create account on [Neon](https://console.neon.tech/) (recommended) or another PostgreSQL provider
- [ ] Create a new database project
- [ ] Copy the connection string (should include `?sslmode=require`)
- [ ] Test connection locally by updating `backend/.env` with the new DATABASE_URL

### 2. Code Preparation
- [ ] Ensure all changes are committed to git
- [ ] Test the application locally with `npm run dev`
- [ ] Run tests with `npm test`
- [ ] Build the project with `npm run build`

### 3. GitHub Repository
- [ ] Create a new repository on GitHub
- [ ] Push your code:
```bash
git init
git add .
git commit -m "Initial commit - Task Management System"
git branch -M main
git remote add origin https://github.com/yourusername/task-management-system.git
git push -u origin main
```

## Vercel Deployment

### 4. Vercel Account Setup
- [ ] Create account on [Vercel](https://vercel.com)
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`

### 5. Deploy Application
- [ ] Run deployment: `vercel --prod`
- [ ] Follow the prompts:
  - Link to existing project? **No**
  - Project name: `task-management-system` (or your preferred name)
  - Directory: **Leave empty** (root directory)
  - Want to override settings? **Yes**
  - Build Command: `npm run build`
  - Output Directory: **Leave empty**
  - Development Command: `npm run dev`

### 6. Environment Variables Configuration

#### Backend Variables (Set in Vercel Dashboard)
- [ ] `DATABASE_URL` = Your Neon PostgreSQL connection string
- [ ] `JWT_ACCESS_SECRET` = Generate a strong random string (32+ characters)
- [ ] `JWT_REFRESH_SECRET` = Generate another strong random string (different from access)
- [ ] `JWT_ACCESS_EXPIRES_IN` = `15m`
- [ ] `JWT_REFRESH_EXPIRES_IN` = `7d`
- [ ] `NODE_ENV` = `production`
- [ ] `FRONTEND_URL` = Your Vercel frontend URL (e.g., `https://task-management-system.vercel.app`)

#### Frontend Variables (Set in Vercel Dashboard)
- [ ] `NEXT_PUBLIC_API_URL` = Your Vercel backend URL (same as frontend URL since they're deployed together)

### 7. Database Migration
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Navigate to backend and run migrations
cd backend
npx prisma migrate deploy
npx prisma generate
```

## Post-Deployment Testing

### 8. Functionality Testing
- [ ] Visit your deployed frontend URL
- [ ] Test user registration
- [ ] Test user login
- [ ] Create a new task
- [ ] Edit a task
- [ ] Delete a task
- [ ] Test logout functionality

### 9. Performance & Security
- [ ] Check that HTTPS is working
- [ ] Verify CORS is properly configured
- [ ] Test API endpoints directly (optional)
- [ ] Check Vercel function logs for any errors

## Troubleshooting

### Common Issues:
1. **Database Connection Errors**
   - Verify DATABASE_URL includes `?sslmode=require`
   - Check that the database is accessible from Vercel

2. **CORS Errors**
   - Ensure FRONTEND_URL matches your actual Vercel domain
   - Check that credentials are properly configured

3. **Build Failures**
   - Check Vercel build logs
   - Ensure all dependencies are in package.json
   - Verify TypeScript compilation

4. **API 404 Errors**
   - Check that routes are properly configured
   - Verify the backend is exporting the app correctly

### Getting Help:
- Check Vercel function logs: `vercel logs`
- View deployment logs in Vercel dashboard
- Check browser developer console for frontend errors

## Success! 🎉

Once all items are checked, your Task Management System should be live and accessible at your Vercel URL.

**Next Steps:**
- Share your application URL
- Monitor usage and performance
- Set up monitoring/analytics (optional)
- Consider setting up a custom domain (optional)