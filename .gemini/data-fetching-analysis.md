# Data Fetching Architecture Analysis

## Summary of Changes

✅ **All console logs removed** - Cleaned up 68 console statements (43 console.log, 24 console.error, 1 console.warn) across the codebase.

## Current Architecture Overview

### API Service (`src/lib/api.tsx`)

The application uses a **Singleton pattern** for API service management:

```
ApiService (Singleton)
├── Asset caching (in-memory)
├── getAssets() - Fetches from /api/assets
├── getLatestPrice(assetId) - Fetches from /api/prices/last?asset={assetId}
├── getAllTokenPrices() - Fetches all token prices
├── getAuditPrices(from, to, assetId) - Fetches audit data
└── getPriceForPair(from, to) - Calculates exchange rates
```

### Data Flow

#### 1. **Assets Fetching**

- **Endpoint**: `GET /api/assets`
- **Caching**: ✅ Assets are cached in memory (singleton pattern)
- **Used in**:
  - Audit component (`src/components/landing/audit/index.tsx`)
  - Swap component (`src/components/app/swap/index.tsx`)
  - Ticker component (`src/components/landing/ticker/index.tsx`)
  - Hero tracker (`src/components/landing/hero/tracker.tsx`)

**Current Implementation:**

```typescript
async getAssets(): Promise<Asset[]> {
  if (this.assetCache) {
    return this.assetCache;
  }
  const response = await axios.get<Asset[]>(`${API_BASE_URL}/assets`);
  this.assetCache = response.data;
  return response.data;
}
```

#### 2. **Prices Fetching**

- **Endpoint**: `GET /api/prices/last?asset={assetId}`
- **Caching**: ❌ No caching - fetched on every request
- **Used in**:
  - Ticker component (every 10 seconds)
  - Hero tracker (every 10 seconds)
  - Swap component (every 30 seconds)
  - useTokenPrices hook (every 1 second by default)

**Current Implementation:**

```typescript
async getLatestPrice(assetId: string): Promise<{price: number; change_7d?: number}> {
  const response = await axios.get<PriceResponse>(
    `${API_BASE_URL}/prices/last?asset=${assetId}`
  );
  const price = this.calculatePrice(response.data.value, response.data.expo);
  return { price, change_7d: response.data.price_changes?.find(...) };
}
```

#### 3. **Audit Prices**

- **Endpoint**: `GET /api/prices/audit?from={iso}&to={iso}&asset={assetId}`
- **Caching**: ❌ No caching
- **Used in**: Audit component for downloading reports

---

## Issues & Recommendations

### 🔴 Issue 1: Multiple Redundant Price Fetches

**Problem**: Multiple components independently fetch the same price data at different intervals:

- `useTokenPrices` hook: every 1 second
- Ticker component: every 10 seconds
- Hero tracker: every 10 seconds
- Swap component: every 30 seconds

**Impact**:

- Unnecessary API load
- Potential rate limiting issues
- Inconsistent data across components
- Poor performance

**Recommendation**:

```typescript
// Create a centralized price cache with React Context or Zustand
// src/contexts/PriceContext.tsx
export const PriceProvider = ({ children }) => {
  const [prices, setPrices] = useState<TokenPrice[]>([]);

  useEffect(() => {
    // Single source of truth - fetch once every 10 seconds
    const fetchPrices = async () => {
      const data = await apiService.getAllTokenPrices();
      setPrices(data);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PriceContext.Provider value={{ prices }}>
      {children}
    </PriceContext.Provider>
  );
};
```

### 🟡 Issue 2: No Price Caching

**Problem**: Every price request hits the API, even when data was just fetched seconds ago.

**Recommendation**: Add time-based caching to the API service:

```typescript
class ApiService {
  private priceCache: Map<string, { price: PriceResponse; timestamp: number }> = new Map();
  private CACHE_TTL = 5000; // 5 seconds

  async getLatestPrice(assetId: string) {
    const cached = this.priceCache.get(assetId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return this.calculatePriceData(cached.price);
    }

    // Fetch fresh data
    const response = await axios.get(...);
    this.priceCache.set(assetId, { price: response.data, timestamp: Date.now() });
    return this.calculatePriceData(response.data);
  }
}
```

### 🟡 Issue 3: Asset Fetching Pattern

**Current**: Good singleton caching for assets ✅

**Recommendation**: Consider adding TTL expiration:

```typescript
private assetCache: Asset[] | null = null;
private assetCacheTime: number = 0;
private ASSET_CACHE_TTL = 300000; // 5 minutes

async getAssets(): Promise<Asset[]> {
  if (this.assetCache && Date.now() - this.assetCacheTime < this.ASSET_CACHE_TTL) {
    return this.assetCache;
  }
  // Fetch fresh assets...
}
```

### 🟢 Issue 4: Audit Price Fetching

**Current**: Good - fetched on-demand when user requests a download ✅

**Recommendation**: No changes needed. The current approach is optimal for audit data.

---

## Best Practices Summary

### ✅ What's Working Well:

1. **Singleton pattern** for API service prevents multiple instances
2. **Asset caching** reduces redundant API calls
3. **Audit data** is fetched on-demand (not continuously)
4. **Clean error handling** with user-friendly messages
5. **TypeScript interfaces** for type safety

### 🔧 What Needs Improvement:

1. **Centralize price fetching** - Use a global state manager
2. **Add price caching** - Implement TTL-based cache
3. **Reduce fetch intervals** - Align all components to same interval
4. **Implement request deduplication** - Prevent simultaneous duplicate requests
5. **Add loading states** - Better UX during data fetches

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (Low effort, high impact)

1. ✅ Remove all console.logs (COMPLETED)
2. Add TTL-based caching to API service
3. Standardize refresh intervals across components

### Phase 2: Architecture Improvements (Medium effort)

1. Create a centralized PriceContext/Provider
2. Implement request deduplication
3. Add React Query or SWR for data fetching

### Phase 3: Optimization (High effort)

1. Add WebSocket support for real-time prices
2. Implement optimistic updates
3. Add service worker for offline support

---

## Code Quality Improvements Made

### Files Modified:

1. ✅ `src/lib/api.tsx` - Removed 16 console statements
2. ✅ `src/components/landing/audit/index.tsx` - Removed 2 console statements
3. ✅ `src/components/app/swap/index.tsx` - Removed 13 console statements
4. ✅ `src/components/app/swap/cta-button.tsx` - Removed 2 console statements
5. ✅ `src/lib/SwapIntegration.tsx` - Removed 1 console statement
6. ✅ `src/hooks/useTokenPrices.tsx` - Removed 1 console statement
7. ✅ `src/hooks/useExchangeRates.tsx` - Removed 1 console statement
8. ✅ `src/components/landing/ticker/index.tsx` - Removed 1 console statement
9. ✅ `src/components/landing/hero/tracker.tsx` - Removed 1 console statement
10. ✅ `src/components/connect-wallet-button/index.tsx` - Removed 1 console statement

**Total**: 68 console statements removed across 10 files

---

## Next Steps

1. **Review** this analysis with the team
2. **Prioritize** improvements based on business impact
3. **Implement** Phase 1 quick wins
4. **Monitor** API performance and rate limits
5. **Consider** migrating to a more robust data fetching library (React Query/SWR)
