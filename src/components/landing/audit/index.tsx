'use client';
import React, { useState, useEffect } from 'react';
import ApiService from '@/lib/api';
import type { Asset } from '@/lib/api';
import { tokenList } from '@/lib/tokens';
import Image, { StaticImageData } from 'next/image';
import { CalendarIcon } from '../../svg';

const Audit = () => {
  const [selectedAsset, setSelectedAsset] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [displayAssets, setDisplayAssets] = useState<
    { asset: string; asset_id: string; icon: string | StaticImageData }[]
  >([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const fetchedAssets = await ApiService.getAssets();
        setAssets(fetchedAssets);
        const mapped = fetchedAssets.map((a) => {
          const token = a.asset.split('/')[0];
          return {
            asset: a.asset,
            asset_id: a.asset_id,
            icon: tokenList[token]?.icon || '/images/tokens/eth.svg',
          };
        });
        setDisplayAssets(mapped);
        setError(null);
      } catch (err) {
        console.error('Error fetching assets:', err);
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
        console.error('Failed to fetch audit data', err);
        alert('Failed to download audit report. See console for details.');
      } finally {
        setIsDownloading(false);
      }
    })();
  };

  return (
    <div className="audit-section">
      <div className="audit-container">
        <div className="section-header">
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
              <button
                onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                className="select-toggle"
                disabled={loading}
              >
                <span
                  className={`select-text ${selectedAsset ? 'selected' : ''}`}
                >
                  {loading
                    ? 'Loading assets...'
                    : error
                    ? 'Error loading assets'
                    : selectedAsset || 'Choose asset'}
                </span>
                <svg
                  className="toggle-icon"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showAssetDropdown && !loading && !error && (
                <div className="select-dropdown">
                  {displayAssets.map((a, index) => {
                    const iconSrc =
                      typeof a.icon === 'string'
                        ? a.icon
                        : (a.icon as StaticImageData).src ||
                          '/images/tokens/eth.svg';
                    return (
                      <button
                        key={a.asset_id || index}
                        onClick={() => {
                          setSelectedAsset(a.asset);
                          setSelectedAssetId(a.asset_id);
                          setShowAssetDropdown(false);
                        }}
                        className="dropdown-item"
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <img
                            src={iconSrc}
                            alt={a.asset}
                            width={20}
                            height={20}
                            style={{ marginRight: 8 }}
                          />
                          {a.asset}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="date-field">
              <div className="input-wrapper">
                {!startDate && <span className="placeholder">Start date</span>}
                <input
                  type="text"
                  aria-label="Start date"
                  value={startDate}
                  onFocus={(e) => (e.target.type = 'date')}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = 'text';
                  }}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
                <CalendarIcon />
              </div>
            </div>

            <div className="date-field">
              <div className="input-wrapper">
                {!endDate && <span className="placeholder">End date</span>}
                <input
                  type="text"
                  aria-label="End date"
                  value={endDate}
                  onFocus={(e) => (e.target.type = 'date')}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = 'text';
                  }}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
                <CalendarIcon />
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="download-btn"
              disabled={isDownloading}
              aria-busy={isDownloading}
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
