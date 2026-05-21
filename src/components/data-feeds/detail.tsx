'use client';

import Link from 'next/link';
import Image, { StaticImageData } from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import apiService from '@/lib/api';
import {
  buildDataFeedRowsFromFeeds,
  DataFeedRow,
  FeedTimeRange,
  formatFeedChange,
  formatFeedPrice,
  getFeedBadgeLabel,
} from '@/lib/data-feeds';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  label: string;
  value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ranges: FeedTimeRange[] = ['live', '1h', '1d', '1w', '1m'];

const RANGE_POLL_INTERVAL_MS = 60_000; // 1 minute

function getRangeWindow(range: FeedTimeRange): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);

  switch (range) {
    case 'live': from.setMinutes(from.getMinutes() - 30); break;
    case '1h':   from.setHours(from.getHours() - 1);     break;
    case '1d':   from.setDate(from.getDate() - 1);        break;
    case '1w':   from.setDate(from.getDate() - 7);        break;
    case '1m':   from.setMonth(from.getMonth() - 1);      break;
  }

  return { from, to };
}

function formatLabel(ts: string, range: FeedTimeRange): string {
  const d = new Date(ts);
  if (range === 'live' || range === '1h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({
  active,
  payload,
  label,
  answerPrefix,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  answerPrefix: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-time">{label}</span>
      <span className="chart-tooltip-value">
        {answerPrefix}{formatFeedPrice(payload[0].value)}
      </span>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const DataFeedDetail = ({ slug }: { slug: string }) => {
  const searchParams = useSearchParams();
  const [activeRange, setActiveRange] = useState<FeedTimeRange>('live');
  const [apiRow, setApiRow] = useState<DataFeedRow | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const assetId = searchParams.get('asset');
  const chainId = searchParams.get('chain');

  // ── Fetch the feed row ──────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchApiRow = async () => {
      try {
        const feeds = await apiService.getFeeds();
        const paramAsset = searchParams.get('asset');
        const paramChain = searchParams.get('chain');
        const row = buildDataFeedRowsFromFeeds(feeds).find((feedRow) =>
          paramAsset && paramChain
            ? feedRow.assetId === paramAsset && feedRow.chainId === paramChain
            : feedRow.feedId.toLowerCase().includes(slug.toLowerCase()),
        );
        if (isMounted) setApiRow(row || null);
      } catch {
        if (isMounted) setApiRow(null);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchApiRow();
    return () => { isMounted = false; };
  }, [assetId, chainId, slug]);

  // ── Fetch chart data ────────────────────────────────────────────────────────
  const fetchChartData = useCallback(async (range: FeedTimeRange, rowAssetId?: string) => {
    setChartLoading(true);
    try {
      const { from, to } = getRangeWindow(range);
      const points = await apiService.getAuditPrices(
        from.toISOString(),
        to.toISOString(),
        rowAssetId,
      );

      console.log('[fetchChartData] raw points count:', points.length, 'sample:', points[0]);

      const mapped: ChartPoint[] = points
        .filter((p) => p.value && p.timestamp)
        .map((p) => ({
          label: formatLabel(p.timestamp, range),
          value: p.value * Math.pow(10, p.expo ?? 0),
        }));

      console.log('[fetchChartData] mapped points count:', mapped.length, 'sample:', mapped[0]);

      setChartPoints(mapped);
    } catch {
      setChartPoints([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // ── Wire up polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiRow) return;

    // Clear any existing poll
    if (pollRef.current) clearInterval(pollRef.current);

    fetchChartData(activeRange, apiRow.assetId);

    if (activeRange === 'live') {
      pollRef.current = setInterval(() => {
        fetchChartData('live', apiRow.assetId);
      }, RANGE_POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeRange, apiRow, fetchChartData]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderFeedIcon = (symbol: string, icon?: string | StaticImageData) => {
    if (typeof icon === 'string' && icon.startsWith('http')) {
      return <img src={icon} alt={symbol} width={28} height={28} />;
    }
    if (icon) {
      return <Image src={icon} alt={symbol} width={28} height={28} />;
    }
    return (
      <span className="feed-detail-fallback-icon">{getFeedBadgeLabel(symbol)}</span>
    );
  };

  // ── Empty / loading states ──────────────────────────────────────────────────
  if (!apiLoading && !apiRow) {
    return (
      <section className="data-feed-detail-page">
        <div className="data-feed-detail-shell">
          <Link href="/data-feeds" className="back-link">Back to Data Feeds</Link>
          <div className="detail-empty-state">
            <h1>Dataset not found</h1>
            <p>The feed you requested is not available in the current dataset.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!apiRow) {
    return (
      <section className="data-feed-detail-page">
        <div className="data-feed-detail-shell">
          <div className="detail-loading-card">Loading dataset…</div>
        </div>
      </section>
    );
  }

  const row = apiRow;
  const isPositive = row.changePct >= 0;
  const formattedAnswer = `${row.answerPrefix}${formatFeedPrice(row.price)}`;

  return (
    <section className="data-feed-detail-page">
      <div className="data-feed-detail-shell">
        <Link href="/data-feeds" className="back-link">Back to Data Feeds</Link>

        <div className="detail-header">
          <div className="detail-title">
            {renderFeedIcon(row.baseSymbol, row.icon)}
            <h1>{row.symbol}</h1>
            <span>{row.feedId}</span>
          </div>
        </div>

        <div className="detail-top-grid">
          <div className="detail-card metadata-card">
            <div className="meta-row">
              <span>Network</span>
              <strong>{row.network}</strong>
            </div>
            <div className="meta-row">
              <span>Trigger parameters</span>
              <strong>{row.deviationThreshold}</strong>
            </div>
            <div className="meta-row">
              <span>Heartbeat</span>
              <strong>{row.heartbeat}</strong>
            </div>
            <div className="detail-tag">{row.assetClass}</div>
          </div>

          <div className="detail-card reference-card">
            <h2>Feed references</h2>
            <div className="meta-row">
              <span>Feed ID</span>
              <strong>{row.feedId}</strong>
            </div>
            <div className="meta-row">
              <span>Oracle route</span>
              <strong>{row.oracleRoute}</strong>
            </div>
            <div className="meta-row">
              <span>Precision</span>
              <strong>{row.precision}</strong>
            </div>
          </div>

          <div className="detail-stat-card">
            <span>Current answer</span>
            <strong>{formattedAnswer}</strong>
          </div>

          <div className="detail-stat-card">
            <span>7D change</span>
            <strong className={isPositive ? 'positive' : 'negative'}>
              {formatFeedChange(row.changePct)}
            </strong>
          </div>
        </div>

        {/* ── Chart ──────────────────────────────────────────────────────── */}
        <div className="detail-chart-shell">
          <div className="range-tabs">
            {ranges.map((range) => (
              <button
                key={range}
                type="button"
                className={activeRange === range ? 'active' : ''}
                onClick={() => setActiveRange(range)}
              >
                {range === 'live' ? 'Live' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="chart-card">
            {chartLoading ? (
              <div className="chart-loading">
                <div className="chart-skeleton" />
              </div>
            ) : chartPoints.length === 0 ? (
              <div className="chart-empty">No price history available for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={chartPoints}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="feedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(217, 198, 255, 0.55)" />
                      <stop offset="100%" stopColor="rgba(217, 198, 255, 0.02)" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#666', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />

                  <YAxis
                    tick={{ fill: '#666', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${row.answerPrefix}${formatFeedPrice(v)}`}
                    width={72}
                    domain={['auto', 'auto']}
                  />

                  <Tooltip
                    content={
                      <ChartTooltip answerPrefix={row.answerPrefix} />
                    }
                    cursor={{ stroke: 'rgba(217,198,255,0.3)', strokeWidth: 1 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#d9c6ff"
                    strokeWidth={1.5}
                    fill="url(#feedGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#d9c6ff', strokeWidth: 0 }}
                    isAnimationActive={activeRange !== 'live'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeRange === 'live' && !chartLoading && (
              <div className="chart-live-badge">
                <span className="live-dot" />
                Live · updates every minute
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataFeedDetail;
