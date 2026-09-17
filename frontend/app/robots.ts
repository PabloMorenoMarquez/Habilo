import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://habilo.es'

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/home', '/home/service/'],
      disallow: ['/dashboard', '/admin', '/chats', '/profile', '/favoritos', '/select-role', '/publish-service'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}