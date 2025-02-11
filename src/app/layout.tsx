import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { GameProvider } from '@/components/game-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { Analytics } from '@/components/analytics'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  description: 'Counter-Strike themed manager game',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  keywords: ['counter-strike', 'manager game', 'strategy', 'esports'],
  authors: [{ name: 'StrikeMasters Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://strikemasters.game',
    title: 'StrikeMasters',
    description: 'Counter-Strike themed manager game',
    siteName: 'StrikeMasters',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StrikeMasters',
    description: 'Counter-Strike themed manager game',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  themeColor: '#111827',
  userScalable: false,
  viewportFit: 'cover',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="application-name" content="StrikeMasters" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StrikeMasters" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#111827" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`
        ${inter.className} 
        min-h-screen 
        bg-gray-900 
        text-gray-100
        antialiased
        overflow-x-hidden
        relative
      `}>
        <ErrorBoundary>
          <ThemeProvider>
            <GameProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1 relative">
                  {children}
                </main>
                
                <footer className="py-4 text-center text-sm text-gray-500">
                  <p>© {new Date().getFullYear()} StrikeMasters. All rights reserved.</p>
                </footer>
              </div>
              
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  className: 'bg-gray-800 text-white',
                  success: {
                    duration: 4000,
                    className: 'bg-green-800 text-white',
                  },
                  error: {
                    duration: 5000,
                    className: 'bg-red-800 text-white',
                  },
                }}
              />
            </GameProvider>
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Analytics */}
        <Analytics />
        
        {/* PWA Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}

// Error handling for production
if (process.env.NODE_ENV === 'production') {
  const originalConsoleError = console.error
  console.error = (...args) => {
    const isReactError = /(?:Warning|Error): /.test(args[0])
    if (!isReactError) {
      originalConsoleError.apply(console, args)
    }
  }
}