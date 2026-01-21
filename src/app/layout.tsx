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

export const metadata: Metadata = {
  title: 'IFA LABS',
  description: `The world's first Multi-chain stablecoin oracle`,
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
  return (
    <html lang="en">
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
