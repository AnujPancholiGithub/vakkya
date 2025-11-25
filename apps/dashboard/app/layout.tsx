import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vakkya Dashboard',
  description: 'Manage your voice agent projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
