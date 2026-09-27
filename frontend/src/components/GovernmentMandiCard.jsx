import React from 'react';

/**
 * GovernmentMandiCard Component
 * Displays Government of India (data.gov.in / AGMARKNET) live mandi wholesale price reference,
 * price comparison against farmer price, range, and metadata.
 */
export default function GovernmentMandiCard({ productName, yourPrice, unit = 'kg', mandiStatus, mandiRecord, message }) {
  if (mandiStatus === 'loading') {
    return (
      <div className="gov-mandi-card card gov-loading-card">
        <div className="mi-spinner" />
        <span>Fetching government market prices...</span>
      </div>
    );
  }

  if (mandiStatus === 'unavailable') {
    return (
      <div className="gov-mandi-card card gov-unavailable-card">
        <div className="gov-card-header">
          <h4 className="gov-product-title">{productName}</h4>
          <span className="badge badge-amber">Government API Unavailable</span>
        </div>
        <p className="gov-unavailable-text">
          ⚠️ {message || 'Government market price currently unavailable.'}
        </p>
      </div>
    );
  }

  if (!mandiRecord) {
    return (
      <div className="gov-mandi-card card gov-no-match-card">
        <div className="gov-card-header">
          <h4 className="gov-product-title">{productName}</h4>
          <span className="badge badge-gray">No Mandi Match</span>
        </div>
        <p className="gov-unavailable-text">
          ℹ️ Government market reference unavailable for this product.
        </p>
      </div>
    );
  }

  const {
    commodity,
    market,
    district,
    state,
    modal_price,
    min_price,
    max_price,
    original_price_unit,
    normalized_price_per_kg,
    date,
    data_date,
    retrieved_at,
    source,
  } = mandiRecord;

  // Calculate dynamic price difference against farmer's price
  let diffText = null;
  let diffClass = '';
  if (normalized_price_per_kg !== null && normalized_price_per_kg !== undefined && yourPrice > 0) {
    const diff = Number((normalized_price_per_kg - yourPrice).toFixed(2));
    if (diff > 0) {
      diffText = `Government market reference is ₹${diff.toFixed(2)}/kg higher than your price.`;
      diffClass = 'diff-higher';
    } else if (diff < 0) {
      diffText = `Government market reference is ₹${Math.abs(diff).toFixed(2)}/kg lower than your price.`;
      diffClass = 'diff-lower';
    } else {
      diffText = 'Your price matches the government market reference.';
      diffClass = 'diff-equal';
    }
  }

  // Calculate min/max range in ₹/kg if min_price and max_price exist
  let priceRangeKg = null;
  if (min_price !== null && min_price !== undefined && max_price !== null && max_price !== undefined) {
    const isQuintal = String(original_price_unit).toLowerCase().includes('quintal');
    const minKg = isQuintal ? (min_price / 100).toFixed(1) : min_price.toFixed(1);
    const maxKg = isQuintal ? (max_price / 100).toFixed(1) : max_price.toFixed(1);
    priceRangeKg = `₹${minKg}–₹${maxKg}/kg`;
  }

  // Format retrieved_at to user's local time HH:MM
  const formattedRetrieved = retrieved_at 
    ? new Date(retrieved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : null;

  return (
    <div className="gov-mandi-card card">
      {/* Header */}
      <div className="gov-card-header">
        <div>
          <span className="gov-section-badge">Government Market Reference</span>
          <h3 className="gov-product-title">{commodity || productName}</h3>
        </div>
        <span className="badge badge-purple">
          🏛️ {source || 'Government of India — data.gov.in / AGMARKNET'}
        </span>
      </div>

      {/* Main Prices Grid */}
      <div className="gov-price-grid">
        <div className="gov-price-cell main-modal-cell">
          <span className="gov-label">Government Market Price</span>
          <span className="gov-value-highlight">
            ₹{normalized_price_per_kg !== null ? normalized_price_per_kg : '—'}/{unit}
          </span>
          <span className="gov-sub">
            (Original: ₹{modal_price !== null ? modal_price : '—'} / {original_price_unit || 'Quintal'})
          </span>
        </div>

        {priceRangeKg && (
          <div className="gov-price-cell">
            <span className="gov-label">Market Range</span>
            <span className="gov-value-range">{priceRangeKg}</span>
            <span className="gov-sub">Min &amp; Max wholesale bounds</span>
          </div>
        )}

        <div className="gov-price-cell">
          <span className="gov-label">Your Price</span>
          <span className="gov-value-your">₹{yourPrice}/{unit}</span>
          <span className="gov-sub">Current listing price</span>
        </div>
      </div>

      {/* Dynamic Comparison Banner */}
      {diffText && (
        <div className={`gov-diff-banner ${diffClass}`}>
          <span>{diffText}</span>
        </div>
      )}

      {/* Metadata / Source Information */}
      <div className="gov-meta-footer">
        <div className="gov-meta-item">
          <strong>Source:</strong> <span>Government of India — data.gov.in / AGMARKNET</span>
        </div>
        <div className="gov-meta-item">
          <strong>Market:</strong> <span>{market || 'Local Mandi'}</span>
        </div>
        <div className="gov-meta-item">
          <strong>District:</strong> <span>{district ? `${district}, ${state}` : state || 'N/A'}</span>
        </div>
        {formattedRetrieved && (
          <div className="gov-meta-item">
            <strong>Retrieved:</strong> <span>{formattedRetrieved}</span>
          </div>
        )}
        <div className="gov-meta-item">
          <strong>Data date:</strong> <span>{data_date || date || 'Latest Available'}</span>
        </div>
      </div>
    </div>
  );
}
