import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/home', '/home/service/'],
      disallow: ['/dashboard', '/admin', '/chats', '/profile', '/favoritos', '/select-role', '/publish-service'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  }
}