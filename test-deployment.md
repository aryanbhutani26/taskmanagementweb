# Test Your Deployed Application

## 1. Health Check
Visit: https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app/health

Should return:
```json
{
  "status": "OK",
  "timestamp": "2026-01-09T10:27:00.000Z"
}
```

## 2. API Test
Visit: https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app/api

Should return:
```json
{
  "message": "Task Management API"
}
```

## 3. Frontend Test
Visit: https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app

Should show your task management application homepage.

## 4. Registration Test
1. Go to: https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app/register
2. Try registering with:
   - Name: Test User
   - Email: test@example.com
   - Password: Test@123

## 5. Login Test
1. Go to: https://task-management-5j0ftlqxg-aryan-bhutanis-projects.vercel.app/login
2. Login with the credentials you just created

## 6. Task Management Test
1. After login, you should be redirected to the dashboard
2. Try creating a new task
3. Try editing and deleting tasks

## Environment Variables Checklist
Make sure these are set in Vercel dashboard:

✅ DATABASE_URL
✅ JWT_ACCESS_SECRET  
✅ JWT_REFRESH_SECRET
✅ JWT_ACCESS_EXPIRES_IN
✅ JWT_REFRESH_EXPIRES_IN
✅ NODE_ENV
✅ FRONTEND_URL
✅ NEXT_PUBLIC_API_URL

## Troubleshooting
- If you get CORS errors, check FRONTEND_URL matches your domain
- If you get database errors, verify DATABASE_URL is correct
- If authentication fails, check JWT secrets are set
- Check Vercel function logs for detailed error messages