'use client';

const SUPPRESSED_PATTERNS = [
  '[Visitors] Localhost detected, tracking disabled',
  'Lit is in dev mode. Not recommended for production',
  'Unable to get preferred account types',
  "The configured WalletConnect 'metadata.url'",
];

function shouldSuppress(args: unknown[]) {
  const message = args.map((arg) => String(arg)).join(' ');

  return SUPPRESSED_PATTERNS.some((pattern) => message.includes(pattern));
}

if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV !== 'production' &&
  !(window as typeof window & { __ifaConsoleNoiseSuppressed?: boolean })
    .__ifaConsoleNoiseSuppressed
) {
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);

  console.info = (...args: unknown[]) => {
    if (!shouldSuppress(args)) originalInfo(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (!shouldSuppress(args)) originalWarn(...args);
  };

  (window as typeof window & { __ifaConsoleNoiseSuppressed?: boolean })
    .__ifaConsoleNoiseSuppressed = true;
}
