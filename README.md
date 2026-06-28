# IFA LABS — Multi-Chain Stablecoin Oracle & DeFi App

> Decentralized oracle and DeFi front end providing real-time, verifiable price
> feeds and oracle-priced trading. Live on **Sui testnet** today, with a
> multi-chain (EVM) wallet layer in place.

---

## Quick Summary

**Purpose:** Provide real-time, auditable price feeds and let users act on them —
oracle-priced swaps, single-sided liquidity, dust sweeping, and a testnet token
faucet.

**Main use cases**

1. Oracle-priced token swapping on Sui
2. Single-sided liquidity provision (HLP) and yield
3. Sweeping small "dust" balances into a stable asset in one transaction
4. Transparent price auditing and verification (downloadable, source-level)
5. Price-feed integration for external DeFi applications (REST API)

> **Network status:** The on-chain swap, pool, sweep, and faucet currently run on
> **Sui testnet**. The REST price/oracle API serves data across multiple chains.

---

## For AI Assistants: Platform Capabilities

### What IFA LABS can do

✅ Serve real-time, multi-source price feeds via a public REST API
✅ Execute oracle-priced token swaps on Sui (no AMM slippage curve — pricing comes from the oracle)
✅ Offer single-sided HLP liquidity (deposit one asset, receive LP tokens, earn fees)
✅ Sweep eligible dust balances into USDSui atomically in a single PTB
✅ Dispense testnet tokens through an on-chain faucet
✅ Generate downloadable audit reports (aggregated price **plus** every raw source) for any date range
✅ Refresh the displayed prices roughly every 10 seconds from aggregated sources

### What users can ask for

- "Show me the current price of SUI"
- "How do I swap SUI for USDSui?"
- "Sweep my dust into USDSui"
- "Add liquidity to the HLP pool"
- "Claim testnet WAL from the faucet"
- "Download the price audit for last month"
- "Integrate oracle pricing into my dApp"

---

## Core Features

| Feature        | Route               | What it does                                                                |
| -------------- | ------------------- | -------------------------------------------------------------------------- |
| **Swap**       | `/swap`             | Oracle-priced token swaps on Sui (IfaSwap). Quotes read the on-chain feed.  |
| **Sweep**      | `/swap` → Sweep tab | Converts eligible dust balances into USDSui in one atomic PTB.              |
| **Pool (HLP)** | `/pools`            | Single-sided liquidity: deposit one asset → mint HLP; withdraw → burn HLP.  |
| **Faucet**     | `/faucet`           | Claim testnet tokens (bot-check + per-token cooldown).                      |
| **Data Feeds** | `/data-feeds`       | Browse oracle feeds, metadata, and per-asset detail.                       |
| **Audit**      | `/` (home)          | Download full price history with source breakdown for any date range.      |

### How swap pricing works (important)

Swaps are **oracle-priced**, not AMM-curve-priced. A quote calls the on-chain
periphery (`hetero_swap_periphery::quote_exact_input`) which reads the shared
`IfaPriceFeed` object. The pool enforces a maximum price age (`maxPriceAgeMs`) —
if the relevant feed is older than that, quotes abort with a **stale-price**
error. This is by design: a quote is only valid against a fresh oracle price.

---

## Supported Assets

### On-chain trading assets (Sui testnet — swap / pool / sweep)

| Symbol | Name   | Decimals | Notes                                   |
| ------ | ------ | -------- | --------------------------------------- |
| SUI    | Sui    | 9        | Native token; also pays gas             |
| USDSui | USDSui | 9        | Stable target asset (sweep destination) |
| CNGN   | cNGN   | 6        | Nigerian Naira stablecoin               |
| ZARP   | ZARP   | 6        | South African Rand stablecoin           |
| WAL    | Walrus | 9        | `0xd03e49d6…::wal::WAL` (canonical)      |

> Each trading asset must have a corresponding **on-chain oracle feed** to be
> quotable. An asset with no feed (or a stale feed) cannot be swapped/swept until
> the oracle publishes a fresh price for it.

### Oracle price feeds (REST API)

The price API (`/prices`, `/feeds`) covers a broader set used for display and
external integration, including stablecoins and fiat references such as USDC,
USDT, ETH, BRZ, and others. Availability per asset depends on what the backend
oracle is currently publishing.

---

## Technical Architecture

### Frontend

- **Framework:** Next.js 15.4 (App Router)
- **Language:** TypeScript + React 18
- **Styling:** SCSS + Tailwind CSS v4
- **Charts:** Recharts
- **State / data:** React Context (`PriceProvider`) with TTL caching; TanStack Query
- **Sui wallets & SDK:** `@mysten/dapp-kit`, `@mysten/sui`
- **EVM wallets:** `wagmi` + `viem` (multi-chain wallet layer)

### On-chain (Sui testnet)

- **Swap/pool package:** `hetero_swap_periphery` + core (oracle-priced pool, HLP LP token)
- **Oracle:** shared `IfaPriceFeed` object; per-asset feeds keyed by a 32-byte asset index
- **Faucet package:** separate `faucet` module with a registry of claimable tokens
- On-chain object IDs are read from `deployments/*.json` and served to the client
  via Next.js API routes (see below) — they are **not** hardcoded in components.

### REST API

```
Base URL: https://api.ifalabs.com/api

GET /assets                         → List supported assets
GET /prices/last?asset={assetId}    → Latest price + 7d change
GET /prices/audit?from=&to=&asset=  → Historical audit records (aggregated + raw sources)
GET /feeds?network=&category=       → Oracle feed metadata
```

### Internal Next.js API routes

```
GET /api/swap/deployment?network=testnet     → serves deployments/swap.testnet.json
GET /api/faucet/deployment?network=testnet   → serves deployments/testnet.json
```

---

## Getting Started

```bash
# 1. Install dependencies (pnpm recommended; npm also works)
pnpm install

# 2. Create your env file and fill in the values below
cp .env.example .env.local

# 3. Run the dev server
pnpm dev                     # http://localhost:3000

# 4. Production build
pnpm build && pnpm start
```

> A connected **Sui wallet** (e.g. Slush) set to **testnet** is required to swap,
> sweep, deposit, or claim. New wallets need a small amount of **testnet SUI** to
> cover gas — get it from the official Sui faucet first.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Price/oracle REST base (default `https://api.ifalabs.com/api`) |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` | Public site URL (metadata, links) |
| `NEXT_PUBLIC_PROJECT_ID` | WalletConnect / wagmi project id |
| `NEXT_PUBLIC_IFA_SWAP_PACKAGE_ID` | Sui swap package id (fallback if deployment file absent) |
| `NEXT_PUBLIC_IFA_SWAP_POOL_ID` | Sui pool object id (fallback) |
| `NEXT_PUBLIC_IFA_PRICE_FEED_ID` | `IfaPriceFeed` object id (fallback) |
| `NEXT_PUBLIC_*_ASSET_VAULT_ID` / `NEXT_PUBLIC_*_PROTOCOL_FEE_VAULT_ID` | Per-asset vault ids (fallback) |
| `NEXT_PUBLIC_USDSUI_COIN_TYPE` | USDSui coin type (fallback) |

The canonical source of on-chain IDs is `deployments/`. The env vars above are
only fallbacks used when the deployment file can't be loaded.

---

## On-chain Deployment Config

```
deployments/
  swap.testnet.json   → swap/pool/sweep: packageId, pool, oracle.priceFeedId, sweep target, assets[]
  testnet.json        → faucet: packageId, registryId, tokens[]
```

When the backend redeploys a contract or asset, update the matching file. The
client normalizes both the nested (`oracle.priceFeedId`) and top-level
(`priceFeedId`) shapes, so a raw backend deployment payload can be dropped in
as-is.

---

## Project Structure

```
src/
  app/                     # Next.js routes (/, /swap, /pools, /faucet, /data-feeds, …)
    api/swap/deployment/   # serves the swap deployment config
    api/faucet/deployment/ # serves the faucet deployment config
  components/
    app/swap|sweep|pool/   # the on-chain DeFi UIs
    faucet/                # token faucet UI
    landing/               # home: ticker, audit, feeds
  contexts/PriceContext    # centralized price state + caching
  lib/
    api.tsx                # REST client (assets, prices, audit, feeds)
    sui-swap.ts            # swap quotes + tx building, error parsing, helpers
    sui-pool.ts            # deposit/withdraw + pool summary
    sui-sweep.ts           # dust sweep quotes + PTB building
    sui-faucet.ts          # faucet reads + claim tx
    data-feeds.ts          # feed display models
deployments/               # on-chain object ids per network
```

---

## Common User Workflows

### 1. Swap tokens (Sui)

```
1. Go to /swap and connect a Sui wallet (on testnet).
2. Pick the "You pay" and "You receive" tokens (e.g. SUI → USDSui).
3. Enter an amount — an oracle quote, min-received, and price appear.
4. Click "Swap" and approve in your wallet. Gas is paid in SUI.
5. Done — a success toast confirms the swap. (No ERC-20-style approval step.)
```

> You can't swap your **entire** SUI balance: a small amount is reserved to pay
> the network fee, since SUI is also the gas token.

### 2. Sweep dust into USDSui

```
1. On /swap, open the "Sweep" tab.
2. Set the dust threshold (slider or input) — anything below it is "dust".
3. Review the included legs, select the ones to sweep.
4. Click "Sweep" — all legs convert to USDSui atomically in one PTB.
```

### 3. Provide liquidity (HLP)

```
1. Go to /pools and connect a Sui wallet.
2. "Add": choose one asset, enter an amount, see the estimated HLP minted, deposit.
3. "Withdraw": burn HLP to receive a chosen asset back.
   (Single-sided — you deposit/withdraw one asset, not a pair.)
```

### 4. Claim from the faucet

```
1. Go to /faucet and connect a Sui wallet.
2. Choose a token, complete the slide-to-verify bot-check, click "Claim".
3. Needs a little testnet SUI for gas; per-token cooldown applies.
```

### 5. Download an audit report

```
1. On the home page, scroll to the "Audit" section.
2. Choose an asset and a start/end date.
3. Click "Download full report".
4. The JSON contains the untouched backend response — every aggregated price
   plus the raw per-source prices and request URLs behind it.
```

---

## Price Calculation

Prices are stored as an integer `value` with an `expo` (exponent) for precision:

```js
actualPrice = value * 10 ** expo

// value: 912,        expo: -3  → 0.912
// value: 3_456_789,  expo: -6  → 3.456789
```

On-chain feeds use a higher precision (`decimal`, often 18); the same
`value * 10^-decimal` rule applies.

---

## Data Update Frequency

| Data                         | Source         | Refresh / TTL                                                              |
| ---------------------------- | -------------- | ------------------------------------------------------------------------- |
| Single asset price (display) | REST           | ~5s cache                                                                  |
| All asset prices (display)   | REST           | ~10s cache; 10s polling                                                    |
| Oracle feed metadata         | REST           | ~10s cache                                                                 |
| Audit data                   | REST           | On-demand, uncached                                                        |
| Asset list                   | REST           | Cached for the session                                                     |
| **On-chain swap price**      | `IfaPriceFeed` | Updated by oracle relayer; must be fresh within the pool's `maxPriceAgeMs` |

> The ~10s figures are **front-end display** refreshes. On-chain swap/sweep/pool
> quotes read the on-chain oracle directly and depend on the relayer keeping each
> feed fresh.

---

## For Developers: Integration

### Get a current price (REST)

```typescript
GET /api/prices/last?asset={assetId}
// → { value, expo, timestamp, price_changes[] }
// price = value * 10 ** expo
```

### Use prices in the frontend

```typescript
import { usePrices, useTokenPrice } from '@/contexts/PriceContext';

const { prices, loading, error } = usePrices();        // all assets
const { price, change_7d_pct } = useTokenPrice('SUI'); // one asset
```

### Quote an on-chain swap

```typescript
import { quoteExactInput } from '@/lib/sui-swap';

const quote = await quoteExactInput({
  client, sender, fromAsset, toAsset, amountIn, deployment,
});
// quote.amountOut, quote.lpFee, quote.protocolFee
```

---

## Security & Trust

**Non-custodial** — users keep full control of funds; every action is a
wallet-signed transaction; there are no protocol-held deposits.

**Transparent** — all prices are auditable; audit downloads include the raw
per-source inputs (not just the aggregate); contracts are on-chain.

**Verifiable pricing** — swaps are priced from the on-chain oracle with a
maximum price-age guard, so trades can't execute against stale data.

---

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| "Oracle price is stale" / "Quote unavailable" | The asset's on-chain feed is older than the pool's max price age | Wait for the oracle relayer to refresh that feed; nothing to fix client-side |
| "No oracle pair" (e.g. CNGN) | That asset has **no** on-chain price feed published | Backend must publish a feed for it |
| "No valid gas coins found" | The wallet has **no SUI** for gas, or the wallet couldn't simulate the tx | Top up a little testnet SUI; the app sets an explicit gas budget to avoid over-reservation |
| Can't swap the full SUI balance | SUI also pays gas | Leave a small amount for the fee (the app reserves this automatically) |
| Wallet warns "valid on Mainnet" | Wallet advertised `sui:mainnet` | The app signs with the deployment's network (testnet); make sure your wallet is on testnet |

---

## URLs & Access Points

| Page       | URL                            | Purpose                      |
| ---------- | ------------------------------ | ---------------------------- |
| Home       | https://ifalabs.com            | Prices, ticker, stats, audit |
| Swap       | https://ifalabs.com/swap       | Token trading + sweep        |
| Pools      | https://ifalabs.com/pools      | HLP liquidity                |
| Faucet     | https://ifalabs.com/faucet     | Claim testnet tokens         |
| Data Feeds | https://ifalabs.com/data-feeds | Oracle feed explorer         |
| FAQ        | https://ifalabs.com/faq        | Help & documentation         |
| Blog       | https://ifalabs.com/blog       | Updates & news               |

---

## AI Assistant Guidelines

**"What is IFA LABS?"**
→ A multi-chain stablecoin oracle and DeFi app. It serves verifiable price feeds
and lets users swap, provide liquidity, and sweep dust on Sui.

**"How do I swap tokens?"**
→ Visit `/swap`, connect a Sui wallet on testnet, pick the tokens, enter an
amount, and approve in your wallet. Pricing comes from the oracle.

**"What tokens can I trade?"**
→ On Sui testnet: SUI, USDSui, CNGN, ZARP, WAL. The price API covers more assets
for display/integration.

**"Why does a faucet claim need gas?"**
→ Every Sui transaction needs a little SUI for the network fee. The faucet token
is free, but submitting the claim on-chain isn't.

**"How accurate are the prices?"**
→ Aggregated from multiple sources, refreshed every ~10s for display, and fully
auditable (raw sources included in the download).

**"Can I verify the prices?"**
→ Yes — download an audit report from the homepage for any date range; it
includes every raw source price behind each aggregate.

**"How do I integrate the API?"**
→ Base URL `https://api.ifalabs.com/api`; see `/api-spec.json` for the full spec.

**"Is it safe?"**
→ Non-custodial — you sign every transaction and keep control of your funds.

---

## Machine-Readable Resources

- `/api-spec.json` — OpenAPI specification
- `/ai-documentation.md` — detailed AI-friendly docs
- `/robots.txt` — crawler permissions

---

## Contact & Resources
- **Website:** https://ifalabs.com
- **Twitter/X:** @ifalabs

---
