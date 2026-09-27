import React, { useState } from 'react';

const DEMAND_CONFIG = {
  HIGH:   { emoji: '🔥', label: 'HIGH DEMAND',   cls: 'demand-high'   },
  MEDIUM: { emoji: '📊', label: 'MEDIUM DEMAND', cls: 'demand-medium' },
  LOW:    { emoji: '📉', label: 'LOW DEMAND',    cls: 'demand-low'    },
  NONE:   { emoji: '—',  label: 'No data yet',   cls: 'demand-none'   },
};

/**
 * PriceIntelligenceCard
 * Displays per-product price comparison with a "Why?" expandable explanation.
 */
export default function PriceIntelligenceCard({ item }) {
  const [showWhy, setShowWhy] = useState(false);

  const {
    product,
    unit = 'kg',
    your_price,
    platform_avg,
    platform_min,
    platform_max,
    comparable_listings,
    suggested_price,
    suggestion_reason = [],
    demand_level = 'NONE',
    your_qty,
  } = item;

  const demandCfg = DEMAND_CONFIG[demand_level] || DEMAND_CONFIG.NONE;
  const hasComparison = platform_avg !== null && platform_avg !== undefined;

  // Price position relative to platform average
  let pricePositionLabel = null;
  let pricePositionCls = '';
  if (hasComparison && your_price > 0) {
    const diff = your_price - platform_avg;
    if (diff < -1) {
      pricePositionLabel = `₹${Math.abs(diff).toFixed(1)} below avg`;
      pricePositionCls = 'price-below';
    } else if (diff > 1) {
      pricePositionLabel = `₹${diff.toFixed(1)} above avg`;
      pricePositionCls = 'price-above';
    } else {
      pricePositionLabel = 'Near avg';
      pricePositionCls = 'price-near';
    }
  }

  return (
    <div className="pi-card card">
      {/* Header */}
      <div className="pi-card-header">
        <div className="pi-card-title-group">
          <h3 className="pi-product-name">{product}</h3>
          <span className={`demand-pill ${demandCfg.cls}`}>
            {demandCfg.emoji} {demandCfg.label}
          </span>
        </div>
        {pricePositionLabel && (
          <span className={`price-position-tag ${pricePositionCls}`}>{pricePositionLabel}</span>
        )}
      </div>

      {/* Price Grid */}
      <div className="pi-price-grid">
        <div className="pi-price-cell pi-your-price">
          <span className="pi-label">Your Price</span>
          <span className="pi-value pi-value-primary">₹{your_price}/{unit}</span>
          <span className="pi-sub">{your_qty} {unit} available</span>
        </div>

        <div className="pi-price-cell">
          <span className="pi-label">AgriLinkX Platform Avg</span>
          {hasComparison ? (
            <span className="pi-value">₹{platform_avg}/{unit}</span>
          ) : (
            <span className="pi-value pi-no-data">—</span>
          )}
          <span className="pi-sub">
            {hasComparison
              ? `${comparable_listings} comparable listing${comparable_listings !== 1 ? 's' : ''}`
              : 'Not enough data'}
          </span>
        </div>

        <div className="pi-price-cell">
          <span className="pi-label">Govt Mandi Ref</span>
          {item.gov_mandi_price !== undefined && item.gov_mandi_price !== null ? (
            <span className="pi-value" style={{ color: '#8b5cf6' }}>₹{item.gov_mandi_price}/{unit}</span>
          ) : (
            <span className="pi-value pi-no-data">—</span>
          )}
          <span className="pi-sub">Government of India OGD</span>
        </div>

        <div className="pi-price-cell">
          <span className="pi-label">Observed Range</span>
          {hasComparison ? (
            <span className="pi-value pi-range">₹{platform_min} – ₹{platform_max}</span>
          ) : (
            <span className="pi-value pi-no-data">—</span>
          )}
          <span className="pi-sub">AgriLinkX platform prices</span>
        </div>

        <div className="pi-price-cell pi-suggested">
          <span className="pi-label">Suggested Price</span>
          {suggested_price !== null && suggested_price !== undefined ? (
            <span className="pi-value pi-value-suggested">₹{suggested_price}/{unit}</span>
          ) : (
            <span className="pi-value pi-no-data">Not enough data</span>
          )}
          <span className="pi-sub">Based on AgriLinkX listings &amp; demand</span>
        </div>
      </div>

      {/* Why? explainability */}
      {suggestion_reason.length > 0 && (
        <div className="pi-why-section">
          <button
            className="pi-why-btn"
            onClick={() => setShowWhy(v => !v)}
            type="button"
          >
            {showWhy ? '▲ Hide explanation' : '▼ Why this price?'}
          </button>
          {showWhy && (
            <div className="pi-why-body">
              <p className="pi-why-title">Suggested price: ₹{suggested_price}/{unit}</p>
              <ul className="pi-why-list">
                {suggestion_reason.map((r, i) => (
                  <li key={i}><span className="pi-check">✓</span> {r}</li>
                ))}
                {item.gov_mandi_price !== undefined && item.gov_mandi_price !== null && (
                  <li><span className="pi-check">✓</span> Government market reference: ₹{item.gov_mandi_price}/{unit}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}


      {/* No comparison data empty state */}
      {!hasComparison && (
        <div className="pi-empty-note">
          <span className="pi-empty-icon">ℹ️</span>
          Not enough platform listings to calculate price comparison yet.
        </div>
      )}
    </div>
  );
}
