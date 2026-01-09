#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting deployment process...\n');

// Check if we're in a git repository
try {
  execSync('git status', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ Not in a git repository. Initializing...');
  execSync('git init');
  console.log('✅ Git repository initialized');
}

// Check if there are uncommitted changes
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.log('📝 Committing changes...');
    execSync('git add .');
    execSync('git commit -m "Deploy to Vercel"');
    console.log('✅ Changes committed');
  }
} catch (error) {
  console.log('⚠️  No changes to commit');
}

// Deploy to Vercel
console.log('🌐 Deploying to Vercel...');
try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('✅ Deployment successful!');
} catch (error) {
  console.log('❌ Deployment failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment complete!');
console.log('📋 Next steps:');
console.log('1. Set up your environment variables in Vercel dashboard');
console.log('2. Configure your database connection');
console.log('3. Run database migrations');
console.log('4. Test your application');