# Task Management System

A full-stack task management application built with Node.js/TypeScript backend and Next.js frontend.

## Features

- User authentication with JWT tokens
- Complete task CRUD operations
- Task filtering and search
- Responsive web interface
- Secure API with proper validation
- PostgreSQL database with Prisma ORM

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js for REST API
- Prisma ORM with PostgreSQL
- JWT for authentication
- bcrypt for password hashing
- Zod for validation

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS for styling
- React Hook Form for forms
- Axios for API calls
- React Query for state management

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for all projects:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database URL and JWT secrets
   
   # Frontend  
   cp frontend/.env.local.example frontend/.env.local
   # Edit frontend/.env.local with your API URL
   ```

4. Set up the database:
   ```bash
   npm run db:setup
   ```

### Development

Start both backend and frontend in development mode:
```bash
npm run dev
```

Or start them individually:
```bash
# Backend (http://localhost:3001)
npm run dev:backend

# Frontend (http://localhost:3000)  
npm run dev:frontend
```

### Database Management

```bash
# Generate Prisma client
npm run db:setup

# Run database migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only  
npm run test:frontend
```

### Building for Production

```bash
# Build both projects
npm run build

# Start production servers
npm start
```

## Project Structure

```
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   └── test/           # Test setup
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/               # Next.js web app
│   ├── src/
│   │   └── app/           # Next.js App Router
│   └── package.json
└── package.json           # Root package.json
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login  
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### Tasks
- `GET /tasks` - Get user tasks (with pagination/filtering)
- `POST /tasks` - Create new task
- `GET /tasks/:id` - Get specific task
- `PATCH /tasks/:id` - Update task
- `PATCH /tasks/:id/toggle` - Toggle task status
- `DELETE /tasks/:id` - Delete task

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/task_management_db
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

This application is configured for deployment on Vercel with PostgreSQL database.

### Quick Deploy

1. **Set up database**: Create a PostgreSQL database on [Neon](https://neon.tech) or similar service

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `JWT_ACCESS_SECRET` - Random secret for access tokens
   - `JWT_REFRESH_SECRET` - Random secret for refresh tokens
   - `FRONTEND_URL` - Your Vercel frontend URL
   - `NEXT_PUBLIC_API_URL` - Your Vercel backend URL

4. **Run database migrations**:
   ```bash
   # Pull environment variables
   vercel env pull .env.local
   
   # Run migrations
   cd backend
   npx prisma migrate deploy
   npx prisma generate
   ```

### Detailed Deployment Guide

See [deploy.md](./deploy.md) for comprehensive deployment instructions including:
- Database setup with Neon
- Environment variable configuration
- Troubleshooting common issues
- Production best practices

### Production URLs
- Frontend: `https://your-app-name.vercel.app`
- Backend API: `https://your-app-name-api.vercel.app`