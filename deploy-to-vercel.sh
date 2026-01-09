#!/bin/bash

echo "🚀 Deploying Task Management System to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Stop any running processes
echo "Stopping local development servers..."

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Configure your domain settings"
echo "3. Test your deployed application"
echo ""
echo "🔧 Required Environment Variables:"
echo "Backend:"
echo "  - DATABASE_URL: postgresql://neondb_owner:npg_A2VFMjs9gBhm@ep-ancient-meadow-ahbjnjaz-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
echo "  - JWT_ACCESS_SECRET: (generate a strong random string)"
echo "  - JWT_REFRESH_SECRET: (generate another strong random string)"
echo "  - NODE_ENV: production"
echo "  - FRONTEND_URL: (your vercel app URL)"
echo ""
echo "Frontend:"
echo "  - NEXT_PUBLIC_API_URL: (your vercel app URL)"