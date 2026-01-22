import type { Metadata } from 'next';
import '@/styles/globals.scss';
import '@/styles/main.scss';
import '@/styles/_variable.scss';
import { TokenProvider } from '@/components/app/token-provider';
import { headers } from 'next/headers';
import ContextProvider from '@/lib/context';
import { Inter, Red_Hat_Mono, Red_Hat_Text } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PriceProvider } from '@/contexts/PriceContext';

const siteConfig = {
  name: 'IFA LABS',
  title: 'IFA LABS - Multi-Chain Stablecoin Oracle',
  description:
    "The world's first Multi-chain stablecoin oracle. Get accurate, real-time price feeds for stablecoins across multiple blockchains. Swap tokens, access liquidity pools, and monitor live crypto prices.",
  url: 'https://ifalabs.com',
  ogImage: '/images/og-image.png',
  keywords: [
    'stablecoin oracle',
    'multi-chain oracle',
    'blockchain oracle',
    'cryptocurrency prices',
    'DeFi oracle',
    'price feeds',
    'CNGN',
    'BRZ',
    'USDC',
    'USDT',
    'crypto swap',
    'liquidity pools',
    'real-time prices',
    'decentralized finance',
    'blockchain data',
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: 'IFA LABS' }],
  creator: 'IFA LABS',
  publisher: 'IFA LABS',
  applicationName: 'IFA LABS Oracle Platform',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'IFA LABS - Multi-Chain Stablecoin Oracle',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@ifalabs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  alternates: {
    canonical: siteConfig.url,
  },
  category: 'technology',
};

const inter = Inter({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
});

const redHatMono = Red_Hat_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-red-hat-mono',
});

const redHatText = Red_Hat_Text({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-red-hat-text',
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}/images/logo.png`,
        },
        sameAs: ['https://twitter.com/ifalabs', 'https://github.com/ifalabs'],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: {
          '@id': `${siteConfig.url}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
<script src="https://cdn.visitors.now/v.js" data-token="fddfeb52-5a60-4a97-98de-fa5ca17b3620"></script>        
<link
          rel="alternate"
          type="application/json"
          href="/api-spec.json"
          title="API Specification"
        />
        <link
          rel="alternate"
          type="text/markdown"
          href="/ai-documentation.md"
          title="AI Documentation"
        />
      </head>
      <body
        className={`${inter.variable}  ${redHatMono.variable} ${redHatText.variable}`}
      >
        <ContextProvider cookies={cookies}>
          <PriceProvider refreshInterval={10000}>
            <TokenProvider>
              {children}
              <Analytics />
              <SpeedInsights />
            </TokenProvider>
          </PriceProvider>
        </ContextProvider>
      </body>
    </html>
  );
}
