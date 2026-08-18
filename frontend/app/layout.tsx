import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/context/auth-context'
import { ServiceWorkerRegister } from '@/components/sw-register'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: 'ServiMarket — Marketplace de Servicios',
  description: 'Encuentra y contrata profesionales de confianza o publica tus servicios en ServiMarket.',
  generator: 'v0.app',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ServiClick',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <GoogleOAuthProvider clientId="942976025153-ogog1r1e33lh9dr5gmamtb10dk67rtsf.apps.googleusercontent.com">
          <AuthProvider>
            {children}
          </AuthProvider>
        </GoogleOAuthProvider>
        <Analytics />
        <ServiceWorkerRegister/>
      </body>
    </html>
  )
}
