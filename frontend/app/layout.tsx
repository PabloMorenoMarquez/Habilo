import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/context/auth-context'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { FeatureFlagsProvider } from '@/context/feature-flags-context'
import { PilotoBanner } from '@/components/piloto-banner'
import { FeedbackButton } from '@/components/feedback-button'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: 'Habilo | Profesionales y servicios cerca de ti',
    template: '%s',
  },
  description: 'Encuentra fontaneros, electricistas, reformas y otros profesionales cerca de ti. Compara servicios y contacta con proveedores en España.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'),
  alternates: { canonical: '/' },
  keywords: ['servicios cerca de mí', 'profesionales en España', 'fontaneros', 'electricistas', 'reformas'],
  openGraph: {
    title: 'Habilo | Profesionales y servicios cerca de ti',
    description: 'Encuentra profesionales de confianza cerca de ti en España.',
    siteName: 'Habilo',
    type: 'website',
    locale: 'es_ES',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habilo',
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
      <body suppressHydrationWarning className="font-sans antialiased bg-background text-foreground">
        <GoogleOAuthProvider clientId="942976025153-ogog1r1e33lh9dr5gmamtb10dk67rtsf.apps.googleusercontent.com">
          <FeatureFlagsProvider>
            <AuthProvider>
              <PilotoBanner />
              {children}
              <FeedbackButton />
            </AuthProvider>
          </FeatureFlagsProvider>
        </GoogleOAuthProvider>
        <Analytics />
        <ServiceWorkerRegister/>
      </body>
    </html>
  )
}
