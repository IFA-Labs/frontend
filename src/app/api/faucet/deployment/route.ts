import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const NETWORK_NAME = /^[a-z0-9_-]+$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network') || 'testnet';

  if (!NETWORK_NAME.test(network)) {
    return NextResponse.json(
      { error: 'Invalid network name.' },
      { status: 400 },
    );
  }

  const deploymentPath = path.join(
    process.cwd(),
    'deployments',
    `${network}.json`,
  );

  try {
    const file = await fs.readFile(deploymentPath, 'utf8');
    return NextResponse.json(JSON.parse(file));
  } catch (error) {
    const status = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
    return NextResponse.json(
      {
        error:
          status === 404
            ? `Missing deployments/${network}.json.`
            : 'Unable to load faucet deployment.',
      },
      { status },
    );
  }
}
