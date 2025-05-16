import type { Metadata } from 'next';
import '@/styles/globals.scss';
import '@/styles/main.scss';
import '@/styles/_variable.scss';
import { TokenProvider } from '@/components/app/api/token-provider';
import { headers } from 'next/headers';
import ContextProvider from '@/lib/context';

export const metadata: Metadata = {
  title: 'IFA LABS',
  description: 'IFA LABS',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');
  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>
          <TokenProvider>{children}</TokenProvider>;
        </ContextProvider>
      </body>
    </html>
  );
}
