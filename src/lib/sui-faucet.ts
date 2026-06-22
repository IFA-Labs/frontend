import { bcs } from '@mysten/sui/bcs';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';

export const CLOCK_ID = '0x6';
export const ZERO_SUI_ADDRESS =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const FAUCET_ABORT_CODES: Record<number, string> = {
  1: 'Only owner can do this.',
  2: 'Only owner or manager can do this.',
  3: 'Wallet is blacklisted.',
  4: 'Recipient is still cooling down.',
  5: 'Faucet does not have enough balance.',
  6: 'Amount must be greater than zero.',
  7: 'Faucet is paused.',
  8: 'Role/list entry already exists.',
  9: 'Role/list entry does not exist.',
  10: 'Token is already added.',
  11: 'Token is not added.',
  12: 'New owner cannot be zero address.',
};

export function parseFaucetError(error: unknown): string {
  const message = collectErrorMessages(error).find(Boolean) ?? '';

  if (/incorrect password/i.test(message)) {
    return 'Slush could not unlock your wallet. Re-enter the correct Slush password, unlock the extension, then try claiming again.';
  }

  if (/user rejected|rejected request|reject/i.test(message)) {
    return 'Transaction signing was cancelled in your wallet.';
  }

  const match = message.match(/MoveAbort.*,\s*(\d+)\)/);
  if (match) {
    const code = Number(match[1]);
    return FAUCET_ABORT_CODES[code] ?? `Transaction failed (abort code ${code}).`;
  }
  return message || 'An unexpected error occurred.';
}

function collectErrorMessages(error: unknown): string[] {
  if (!error) return [];
  if (typeof error === 'string') return [error];
  if (error instanceof Error) {
    return [
      error.message,
      ...collectErrorMessages((error as { cause?: unknown }).cause),
      ...collectErrorMessages((error as { shape?: unknown }).shape),
      ...collectErrorMessages((error as { data?: unknown }).data),
    ];
  }
  if (typeof error !== 'object') return [String(error)];

  const record = error as Record<string, unknown>;
  return [
    typeof record.message === 'string' ? record.message : '',
    ...collectErrorMessages(record.cause),
    ...collectErrorMessages(record.shape),
    ...collectErrorMessages(record.data),
  ].filter(Boolean);
}

export interface FaucetTokenConfig {
  tokenType: string;
  coinObjectId?: string;
  claimAmount: number | string;
  cooldownMs: number | string;
  name: string;
  symbol: string;
  description?: string;
  iconUrl?: string;
  isOfficial?: boolean;
  decimals: number;
}

export interface FaucetDeployment {
  network: string;
  packageId: string;
  registryId: string;
  tokens: FaucetTokenConfig[];
}

export interface FaucetMetadata {
  name: string;
  symbol: string;
  description: string;
  iconUrl: string;
  isOfficial: boolean;
  decimals: number;
}

export interface FaucetTokenState {
  balance: bigint;
  claimAmount: bigint;
  paused: boolean;
  cooldownMs: bigint;
  totalClaims: bigint;
  totalDistributed: bigint;
  metadata: FaucetMetadata;
}

export interface FaucetAccountState {
  canClaim: boolean;
  remainingCooldownMs: bigint;
  isBlacklisted: boolean;
  walletBalance: bigint;
}

type DevInspectReturnValue = [number[], string];

export function normalizeSuiTokenType(tokenType: string) {
  const trimmed = tokenType.trim();
  const prefixed =
    trimmed.startsWith('0x') || !/^[0-9a-fA-F]+::/.test(trimmed)
      ? trimmed
      : `0x${trimmed}`;

  // Canonicalize the struct tag (zero-pads addresses, lowercases hex) so coin
  // types compare equal regardless of how the RPC or config formats them, e.g.
  // `0x3d89..` (RPC, leading zero stripped) vs `0x03d89..` (deployment config).
  try {
    return normalizeStructTag(prefixed);
  } catch {
    return prefixed;
  }
}

const metadataBcs = bcs.struct('FaucetMetadata', {
  name: bcs.string(),
  symbol: bcs.string(),
  description: bcs.string(),
  icon_url: bcs.string(),
  is_official: bcs.bool(),
  decimals: bcs.u8(),
});

function bytes(returnValue: DevInspectReturnValue) {
  return Uint8Array.from(returnValue[0]);
}

function u64(returnValue: DevInspectReturnValue) {
  return BigInt(bcs.u64().parse(bytes(returnValue)));
}

function bool(returnValue: DevInspectReturnValue) {
  return bcs.bool().parse(bytes(returnValue));
}

function getReturnValues(result: Awaited<ReturnType<SuiJsonRpcClient['devInspectTransactionBlock']>>) {
  const status = result.effects.status;
  if (status.status !== 'success') {
    throw new Error(status.error || 'Faucet read failed.');
  }

  return result.results?.flatMap((item) => item.returnValues ?? []) ?? [];
}

export function formatTokenAmount(amount: bigint, decimals: number) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  const fractionText = fraction
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export function formatCooldown(ms: bigint) {
  if (ms <= BigInt(0)) return 'Ready';

  const totalSeconds = Number(ms / BigInt(1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export async function getFaucetTokenState({
  client,
  deployment,
  tokenType,
  sender = ZERO_SUI_ADDRESS,
}: {
  client: SuiJsonRpcClient;
  deployment: FaucetDeployment;
  tokenType: string;
  sender?: string;
}): Promise<FaucetTokenState> {
  const tx = new Transaction();
  const normalizedTokenType = normalizeSuiTokenType(tokenType);

  tx.moveCall({
    target: `${deployment.packageId}::faucet::get_token_faucet_info`,
    typeArguments: [normalizedTokenType],
    arguments: [tx.object(deployment.registryId)],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });
  const values = getReturnValues(result);
  const metadata = metadataBcs.parse(bytes(values[6] as DevInspectReturnValue));

  return {
    balance: u64(values[0] as DevInspectReturnValue),
    claimAmount: u64(values[1] as DevInspectReturnValue),
    paused: bool(values[2] as DevInspectReturnValue),
    cooldownMs: u64(values[3] as DevInspectReturnValue),
    totalClaims: u64(values[4] as DevInspectReturnValue),
    totalDistributed: u64(values[5] as DevInspectReturnValue),
    metadata: {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      iconUrl: metadata.icon_url,
      isOfficial: metadata.is_official,
      decimals: metadata.decimals,
    },
  };
}

export async function getSupportedTokenKeys({
  client,
  deployment,
  sender = ZERO_SUI_ADDRESS,
}: {
  client: SuiJsonRpcClient;
  deployment: FaucetDeployment;
  sender?: string;
}) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${deployment.packageId}::faucet::get_supported_token_keys`,
    arguments: [tx.object(deployment.registryId)],
  });

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: tx,
  });
  const values = getReturnValues(result);

  return bcs
    .vector(bcs.string())
    .parse(bytes(values[0] as DevInspectReturnValue))
    .map(normalizeSuiTokenType);
}

export async function getFaucetAccountState({
  client,
  deployment,
  tokenType,
  account,
  recipient,
}: {
  client: SuiJsonRpcClient;
  deployment: FaucetDeployment;
  tokenType: string;
  account: string;
  recipient: string;
}): Promise<FaucetAccountState> {
  const tx = new Transaction();
  const normalizedTokenType = normalizeSuiTokenType(tokenType);

  tx.moveCall({
    target: `${deployment.packageId}::faucet::get_remaining_cooldown`,
    typeArguments: [normalizedTokenType],
    arguments: [
      tx.object(deployment.registryId),
      tx.object(CLOCK_ID),
      tx.pure.address(recipient),
    ],
  });

  tx.moveCall({
    target: `${deployment.packageId}::faucet::can_claim`,
    typeArguments: [normalizedTokenType],
    arguments: [
      tx.object(deployment.registryId),
      tx.object(CLOCK_ID),
      tx.pure.address(account),
      tx.pure.address(recipient),
    ],
  });

  tx.moveCall({
    target: `${deployment.packageId}::faucet::is_blacklisted`,
    arguments: [tx.object(deployment.registryId), tx.pure.address(account)],
  });

  const [inspectResult, balance] = await Promise.all([
    client.devInspectTransactionBlock({
      sender: account,
      transactionBlock: tx,
    }),
    client.getBalance({
      owner: account,
      coinType: normalizedTokenType,
    }),
  ]);

  const values = getReturnValues(inspectResult);

  return {
    remainingCooldownMs: u64(values[0] as DevInspectReturnValue),
    canClaim: bool(values[1] as DevInspectReturnValue),
    isBlacklisted: bool(values[2] as DevInspectReturnValue),
    walletBalance: BigInt(balance.totalBalance),
  };
}

export function createClaimTransaction({
  deployment,
  tokenType,
  recipient,
}: {
  deployment: FaucetDeployment;
  tokenType: string;
  recipient: string;
}) {
  const tx = new Transaction();
  const normalizedTokenType = normalizeSuiTokenType(tokenType);

  tx.moveCall({
    target: `${deployment.packageId}::faucet::claim_tokens`,
    typeArguments: [normalizedTokenType],
    arguments: [
      tx.object(deployment.registryId),
      tx.object(CLOCK_ID),
      tx.pure.address(recipient),
    ],
  });

  return tx;
}

export async function preflightClaimTransaction({
  client,
  deployment,
  tokenType,
  recipient,
  sender,
}: {
  client: SuiJsonRpcClient;
  deployment: FaucetDeployment;
  tokenType: string;
  recipient: string;
  sender: string;
}) {
  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock: createClaimTransaction({
      deployment,
      tokenType,
      recipient,
    }),
  });

  getReturnValues(result);
}
