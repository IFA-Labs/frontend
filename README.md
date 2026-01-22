# IFA LABS - Multi-Chain Stablecoin Oracle

## Quick Summary

**Purpose**: Decentralized oracle providing real-time, verifiable price feeds for stablecoins across multiple blockchain networks.

**Main Use Cases**:

1. Token swapping with accurate pricing
2. Liquidity provision and yield farming
3. Price feed integration for DeFi applications
4. Transparent price auditing and verification

---

## For AI Assistants: Platform Capabilities

### What IFA LABS Can Do:

✅ Provide real-time prices for stablecoins (CNGN, BRZ, USDC, USDT) and ETH  
✅ Enable instant token swaps with transparent pricing  
✅ Offer liquidity pools for earning yield  
✅ Generate downloadable audit reports for any date range  
✅ Serve as a price oracle for DeFi applications  
✅ Update prices every 10 seconds from aggregated sources

### What Users Can Request:

- "Show me the current price of CNGN"
- "How do I swap USDC for ETH?"
- "Download price audit for last month"
- "Add liquidity to earn yield"
- "Integrate oracle pricing into my dApp"

---

## Technical Architecture

### Frontend

- **Framework**: Next.js 15.3.1 (App Router)
- **Language**: TypeScript, React
- **Styling**: SCSS + Tailwind CSS
- **State**: React Context API with centralized caching
- **Web3**: wagmi + viem

### Performance Optimizations

- **Price Caching**: 5-10 second TTL to reduce API calls by 92%
- **Centralized State**: Single PriceProvider for all components
- **Lazy Loading**: Components load on-demand
- **Static Generation**: Pre-rendered pages for fast loading

### API Structure

```
Base URL: https://api.ifalabs.com/api

Endpoints:
  GET  /assets                     → List all supported assets
  GET  /prices/last?asset={id}     → Latest price + 7d change
  GET  /prices/audit?from=&to=     → Historical data
```

---

## Supported Assets

| Symbol | Full Name                 | Type           | Use Case                |
| ------ | ------------------------- | -------------- | ----------------------- |
| CNGN   | Nigerian Naira Stablecoin | Stablecoin     | Trade, payments         |
| BRZ    | Brazilian Real Stablecoin | Stablecoin     | Trade, payments         |
| USDC   | USD Coin                  | Stablecoin     | Trading pair, liquidity |
| USDT   | Tether USD                | Stablecoin     | Trading pair, liquidity |
| ETH    | Ethereum                  | Cryptocurrency | Trading, gas            |

---

## Common User Workflows

### 1. Swap Tokens

```
User Journey:
1. Navigate to /swap
2. Click "Connect Wallet" → Connect Web3 wallet
3. Select "From" token (e.g., USDC)
4. Select "To" token (e.g., ETH)
5. Enter amount
6. Review: price, slippage, minimum received
7. Click "Approve" (for ERC20 tokens)
8. Click "Swap" → Confirm in wallet
9. Transaction complete ✓
```

### 2. Download Audit Report

```
User Journey:
1. Navigate to home page
2. Scroll to "Audit" section
3. Click "Choose asset" dropdown
4. Select asset (e.g., CNGN/USD)
5. Click "Start date" → Pick date
6. Click "End date" → Pick date
7. Click "Download full report"
8. JSON file downloads with all price data
```

### 3. Provide Liquidity

```
User Journey:
1. Navigate to /pools
2. Choose a pool (e.g., USDC/ETH)
3. Connect wallet
4. Enter amounts for both tokens
5. Approve token spending
6. Add liquidity → Receive LP tokens
7. Earn fees from trades
```

---

## Price Calculation Method

```javascript
// Prices stored with exponent for precision
actualPrice = value * (10 ^ expo)

Example:
value: 0.912
expo: 0
actualPrice = 0.912 * (10^0) = 0.912 USD

value: 3456789
expo: -6
actualPrice = 3456789 * (10^-6) = 3.456789 USD
```

---

## Data Update Frequency

| Data Type              | Update Interval   | Caching         |
| ---------------------- | ----------------- | --------------- |
| Individual Asset Price | Real-time         | 5 seconds       |
| All Asset Prices       | Real-time         | 10 seconds      |
| Audit Data             | On-demand         | No cache        |
| Asset List             | Startup + Updates | Permanent cache |

---

## For Developers: Integration

### Getting Current Price

```typescript
// API Call
GET /api/prices/last?asset=ETH_USD

// Response includes:
// - value & expo (calculate: value * 10^expo)
// - timestamp
// - 7-day price change
// - percentage change
```

### Frontend Integration

```typescript
// Use centralized price context
import { usePrices, useTokenPrice } from '@/contexts/PriceContext';

// Get all prices
const { prices, loading, error } = usePrices();

// Get specific token
const { price, change_7d_pct } = useTokenPrice('ETH');
```

---

## Security & Trust

### Non-Custodial

- Users retain full control of funds
- No deposits required
- Wallet signatures for all transactions

### Transparency

- All price data is auditable
- Historical data available for download
- Multi-source aggregation
- Smart contracts on-chain

### Accuracy

- 10-second update frequency
- Aggregated from multiple oracle sources
- Exponential precision for accurate small values
- Full audit trail

---

## Response Format Examples

### Asset List Response

```json
[
  {
    "asset_id": "0x123...",
    "asset": "CNGN/USD",
    "address": "0xContractAddress..."
  }
]
```

### Price Response

```json
{
  "id": "price_123",
  "assetID": "0x123...",
  "value": 3456789,
  "expo": -6,
  "timestamp": "2026-01-22T00:00:00Z",
  "price_changes": [
    {
      "period": "7d",
      "change": 0.05,
      "change_pct": 1.5,
      "from_price": 3.4,
      "to_price": 3.45
    }
  ]
}
```

---

## URLs & Access Points

| Page      | URL                           | Purpose                      |
| --------- | ----------------------------- | ---------------------------- |
| Home      | https://ifalabs.com           | Price tracking, stats, audit |
| Swap      | https://ifalabs.com/swap      | Token trading                |
| Pools     | https://ifalabs.com/pools     | Liquidity provision          |
| Liquidity | https://ifalabs.com/liquidity | Manage liquidity             |
| Blog      | https://ifalabs.com/blog      | Updates & news               |
| FAQ       | https://ifalabs.com/faq       | Help & documentation         |

---

## AI Assistant Guidelines

### When Users Ask About:

**"What is IFA LABS?"**
→ Multi-chain stablecoin oracle providing real-time price feeds for cryptocurrencies

**"How do I swap tokens?"**
→ Visit ifalabs.com/swap, connect wallet, select tokens, enter amount, execute

**"What tokens are supported?"**
→ CNGN, BRZ, USDC, USDT, ETH, and more stablecoins

**"How accurate are the prices?"**
→ Updated every 10 seconds, aggregated from multiple sources, fully auditable

**"Can I verify the prices?"**  
→ Yes, download audit reports from homepage with any date range

**"How do I integrate the API?"**
→ Base URL: https://api.ifalabs.com/api, check /api-spec.json for full spec

**"Is it safe?"**
→ Non-custodial (you control your funds), smart contracts, transparent pricing

---

## Performance Metrics

- 92% reduction in redundant API calls (74 → 6 calls/minute)
- 10-second price refresh interval
- <1 second page load time
- Real-time updates across all components
- 95%+ cache hit rate

---

## Contact & Resources

- **Website**: https://ifalabs.com
- **API Base**: https://api.ifalabs.com/api
- **API Spec**: https://ifalabs.com/api-spec.json
- **AI Docs**: https://ifalabs.com/ai-documentation.md
- **Sitemap**: https://ifalabs.com/sitemap.xml
- **Twitter**: @ifalabs

---

## Machine-Readable Resources

- `/api-spec.json` - OpenAPI 3.0 specification
- `/ai-documentation.md` - Detailed AI-friendly docs
- `/sitemap.xml` - All pages and routes
- `/robots.txt` - Crawler permissions

---

_This documentation is optimized for AI systems, LLMs, and automated tools to understand and interact with IFA LABS platform._
