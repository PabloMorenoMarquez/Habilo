import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/auth-context'
import { ConsentProvider } from '@/context/consent-context'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { FeatureFlagsProvider } from '@/context/feature-flags-context'
import { PilotoBanner } from '@/components/piloto-banner'
import { FeedbackButton } from '@/components/feedback-button'
import { ConsentBanner, AnalyticsGate } from '@/components/consent-banner'
import LandingTracker from '@/components/landing/landing-tracker'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

// Solo para el nombre de la marca (components/brand/logo.tsx).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: {
    default: 'Habilo | Profesionales y servicios cerca de ti',
    template: '%s',
  },
  description: 'Clases particulares en Talavera de la Reina. Encuentra profesores por materia y nivel, compara precios y contacta directamente con el profesor.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'),
  keywords: ['clases particulares Talavera de la Reina', 'profesores particulares Talavera', 'clases de matemáticas', 'clases de inglés', 'apoyo escolar'],
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
    <html lang="es" className={`${inter.variable} ${jakarta.variable} ${bricolage.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-background text-foreground">
        <ConsentProvider>
          <GoogleOAuthProvider clientId="942976025153-ogog1r1e33lh9dr5gmamtb10dk67rtsf.apps.googleusercontent.com">
            <FeatureFlagsProvider>
              <AuthProvider>
                {/* Global a propósito: el ?ref= sobrevive al redirect con token hacia /login y queda en habilo_utm_v1. */}
                <LandingTracker />
                <PilotoBanner />
                {children}
                <FeedbackButton />
                <ConsentBanner />
              </AuthProvider>
            </FeatureFlagsProvider>
          </GoogleOAuthProvider>
          <AnalyticsGate />
          <ServiceWorkerRegister/>
        </ConsentProvider>
      </body>
    </html>
  )
}
