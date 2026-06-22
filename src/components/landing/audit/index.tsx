'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ApiService from '@/lib/api';
import type { Asset } from '@/lib/api';
import { tokenList, currencyFlagMap } from '@/lib/tokens';
import Image, { StaticImageData } from 'next/image';
import { CalendarIcon } from '../../svg';

interface AssetOption {
  asset: string;
  asset_id: string;
  icon: string | StaticImageData;
  flag?: string;
}

interface AssetDropdownProps {
  options: AssetOption[];
  value: string;
  onChange: (asset_id: string, asset: string) => void;
  loading: boolean;
  error: string | null;
}

const AssetDropdown = ({ options, value, onChange, loading, error }: AssetDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.asset_id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const scrollHandler = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    window.addEventListener('scroll', scrollHandler, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) { setOpen(false); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="select-toggle"
        disabled={loading || !!error}
      >
        <span className={`select-text ${selected ? 'selected' : ''}`}>
          {loading ? 'Loading assets...' : error ? 'Error loading assets' : selected ? selected.asset : 'Choose asset'}
        </span>
        <svg className="toggle-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && !loading && !error && (
        <div
          ref={panelRef}
          className="audit-asset-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
        >
          {options.map((o, index) => {
            const iconSrc = typeof o.icon === 'string' ? o.icon : (o.icon as StaticImageData).src || '/images/tokens/eth.svg';
            return (
              <button
                type="button"
                key={o.asset_id || index}
                onClick={() => { onChange(o.asset_id, o.asset); setOpen(false); }}
                className={`audit-asset-option ${o.asset_id === value ? 'selected' : ''}`}
              >
                {o.flag ? (
                  <span className="audit-asset-flag">{o.flag}</span>
                ) : (
                  <img src={iconSrc} alt={o.asset} width={22} height={22} />
                )}
                {o.asset}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

const today = new Date().toISOString().split('T')[0];

const Audit = () => {
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [displayAssets, setDisplayAssets] = useState<AssetOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const fetchedAssets = await ApiService.getAssets();
        setAssets(fetchedAssets);
        const mapped = fetchedAssets.map((a) => {
          const token = a.asset.split('/')[0];
          const tokenEntry = tokenList[token] || tokenList[token.toUpperCase()];
          const flag = currencyFlagMap[token.toUpperCase()];
          return {
            asset: a.asset,
            asset_id: a.asset_id,
            icon: tokenEntry?.icon || '/images/tokens/eth.svg',
            flag: tokenEntry ? undefined : flag,
          };
        });
        setDisplayAssets(mapped);
        setError(null);
      } catch (err) {
        setError('Failed to load assets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  const handleDownload = () => {
    if (!selectedAssetId || !startDate || !endDate) {
      alert('Please fill in all fields before downloading the report.');
      return;
    }

    setIsDownloading(true);
    (async () => {
      try {
        const fromISO = `${startDate}T00:00:00Z`;
        const toISO = `${endDate}T00:00:00Z`;
        const data = await ApiService.getAuditPrices(
          fromISO,
          toISO,
          selectedAssetId || undefined,
        );
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-${selectedAssetId}-${startDate}_${endDate}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 504) {
          alert(
            'The audit report is taking too long to generate. Please try a smaller date range or try again later.',
          );
          return;
        }

        alert('Failed to download audit report. Please try again.');
      } finally {
        setIsDownloading(false);
      }
    })();
  };

  const openDatePicker = (
    input: HTMLInputElement | null,
    setFocused: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    if (!input) {
      return;
    }

    setFocused(true);
    input.focus({ preventScroll: true });

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      }
    } catch {
      // Some browsers only allow showPicker from specific user gestures.
    }
  };

  return (
    <div className="audit-section">
      <div className="audit-container">
        <div className="audit-section-header">
          <h2>
            We give full <br />
            transparency
          </h2>
          <p>
            Our assets' value is meticulously audited and transparently
            published every day, ensuring full accountability. For detailed
            insights, you can download the latest audit report here.
          </p>
        </div>

        <div className="audit-request">
          <div className="request-title">Request for Audit</div>
          <div className="request-fields">
            <div className="asset-select">
              <AssetDropdown
                options={displayAssets}
                value={selectedAssetId || ''}
                onChange={(asset_id, asset) => {
                  setSelectedAssetId(asset_id);
                  setSelectedAsset(asset);
                }}
                loading={loading}
                error={error}
              />
            </div>

            <div className="date-field">
              <div
                className="input-wrapper"
                onClick={() =>
                  openDatePicker(startDateInputRef.current, setStartDateFocused)
                }
              >
                {!startDate && !startDateFocused && (
                  <span className="placeholder">Start date</span>
                )}
                <input
                  ref={startDateInputRef}
                  type="date"
                  aria-label="Start date"
                  value={startDate}
                  max={endDate || today}
                  onFocus={() => setStartDateFocused(true)}
                  onBlur={() => {
                    if (!startDate) setStartDateFocused(false);
                  }}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                  }}
                  className={`date-input ${startDate ? 'has-value' : ''}`}
                />
                <CalendarIcon />
              </div>
            </div>

            <div className="date-field">
              <div
                className="input-wrapper"
                onClick={() =>
                  openDatePicker(endDateInputRef.current, setEndDateFocused)
                }
              >
                {!endDate && !endDateFocused && (
                  <span className="placeholder">End date</span>
                )}
                <input
                  ref={endDateInputRef}
                  type="date"
                  aria-label="End date"
                  value={endDate}
                  min={startDate || undefined}
                  max={today}
                  onFocus={() => setEndDateFocused(true)}
                  onBlur={() => {
                    if (!endDate) setEndDateFocused(false);
                  }}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                  }}
                  className={`date-input ${endDate ? 'has-value' : ''}`}
                />
                <CalendarIcon />
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="download-btn"
              disabled={isDownloading}
              aria-busy={isDownloading ? 'true' : 'false'}
              title="download"
            >
              {isDownloading
                ? 'Downloading...'
                : downloadSuccess
                  ? 'Downloaded'
                  : 'Download full report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Audit;
// 3223871992
// firstbank
