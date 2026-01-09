import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorProvider } from '@/contexts/ErrorContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NetworkStatus } from '@/components/NetworkStatus'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Task Management System',
  description: 'A comprehensive task management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ErrorProvider>
            <AuthProvider>
              <NetworkStatus />
              <div className="min-h-screen bg-gray-50">
                {children}
              </div>
            </AuthProvider>
          </ErrorProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}