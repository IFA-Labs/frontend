import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ifalabs.com';
  const currentDate = new Date();

  // Static pages
  const routes = ['', '/swap', '/liquidity', '/pools', '/blog', '/faq'].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: route === '' ? 1 : 0.8,
    }),
  );

  return routes;
}
