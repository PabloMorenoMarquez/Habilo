import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es').replace(/\/+$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/home', '/home/service/', '/profesores/'],
      disallow: [
        '/dashboard',
        '/admin',
        '/chats',
        '/profile',
        '/favoritos',
        '/select-role',
        '/publish-service',
        '/login',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
