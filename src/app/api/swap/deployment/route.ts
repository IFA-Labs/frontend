import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get('network') || 'testnet';

  if (!/^[a-z0-9_-]+$/i.test(network)) {
    return NextResponse.json({ error: 'Invalid network.' }, { status: 400 });
  }

  try {
    const deploymentPath = path.join(
      process.cwd(),
      'deployments',
      `${network}.json`,
    );
    const deployment = JSON.parse(await readFile(deploymentPath, 'utf8'));

    return NextResponse.json(deployment);
  } catch (error) {
    return NextResponse.json(
      { error: `No deployment config found for ${network}.` },
      { status: 404 },
    );
  }
}
