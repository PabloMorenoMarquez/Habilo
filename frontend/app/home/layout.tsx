import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Servicios y profesionales cerca de ti',
  description: 'Busca fontaneros, electricistas, técnicos, reformas y otros profesionales cerca de ti en España.',
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'Servicios y profesionales cerca de ti | Habilo',
    description: 'Busca y contacta con profesionales de confianza en tu ciudad.',
    url: '/home',
    type: 'website',
  },
}

export default function HomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}