import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowRightIcon,
  SparklesIcon,
} from './Icons';

export default function FarmerRecommendationCard({
  listing,
  requestedQuantity = 1,
  requestedUnit = 'kg',
  rank = 'best', // 'best', 'nearby', 'price', 'other'
  isSelected = false,
  onViewOnMap,
}) {
  const navigate = useNavigate();
  const [showReasons, setShowReasons] = useState(true);

  if (!listing) return null;

  const isBest = rank === 'best';
  const isNearby = rank === 'nearby';
  const isPrice = rank === 'price';

  const badgeText = isBest
    ? '🥇 BEST MATCH'
    : isNearby
    ? '🥈 NEARBY ALTERNATIVE'
    : isPrice
    ? '🥉 BEST PRICE'
    : 'DIRECT PRODUCER';

  const ribbonClass = isBest
    ? 'gold-ribbon'
    : isNearby
    ? 'silver-ribbon'
    : isPrice
    ? 'bronze-ribbon'
    : 'emerald-ribbon';

  const cardClass = isSelected
    ? 'selected-card-glow'
    : isBest
    ? 'best-match-glow'
    : isNearby
    ? 'silver-tier'
    : isPrice
    ? 'bronze-tier'
    : '';

  const isAssamOriginMatch =
    listing.badges?.some((b) => b.includes('Assam Origin')) ||
    (listing.origin && listing.origin.toLowerCase().includes('assam'));

  const hasValidLocation =
    typeof listing.latitude === 'number' &&
    !isNaN(listing.latitude) &&
    typeof listing.longitude === 'number' &&
    !isNaN(listing.longitude);

  const reasons = listing.reasons || [];

  return (
    <div id={`listing-card-${listing.id}`} className={`recommendation-tier-card card ${cardClass}`}>
      <div className={`tier-ribbon ${ribbonClass}`}>
        <span className="trophy-icon">{badgeText.split(' ')[0]}</span>
        <span>
          {badgeText} (AI MATCH: {listing.recommendationScore || 90}%)
        </span>
      </div>

      <div className="tier-card-body">
        <div className="tier-header-row">
          <div>
            <h3 className="farmer-name-large">{listing.farmerName}</h3>
            <span className="dist-line">
              <MapPinIcon size={13} color="#059669" />
              {hasValidLocation && listing.distance != null ? (
                <strong>📍 {listing.distance} km away</strong>
              ) : (
                <span className="badge badge-amber">Location unavailable</span>
              )}{' '}
              • {listing.subDistrict || listing.origin}
            </span>
          </div>

          <div className="badges-stack">
            {listing.verified && (
              <span className="badge badge-emerald">
                <ShieldCheckIcon size={12} /> ✓ Verified Farmer
              </span>
            )}
            {isAssamOriginMatch && (
              <span className="badge badge-gold">
                Assam Origin Match ✓
              </span>
            )}
            <span className="rating-pill">⭐ {listing.rating || 4.5}</span>
          </div>
        </div>

        {/* Product specs row */}
        <div className="product-highlight-box">
          <div className="prod-spec">
            <span className="prod-main-title">{listing.product}</span>
            <span className="prod-variety-text">{listing.variety || 'Standard Harvest'}</span>
            <span className="prod-origin-sub">
              Origin: <strong>{listing.origin || 'Local Farm'}</strong>
            </span>
          </div>

          <div className="prod-pricing">
            <span className="price-big">₹{listing.price}</span>
            <span className="price-per">/ {listing.unit || 'kg'}</span>
          </div>
        </div>

        {/* Attributes grid */}
        <div className="tier-attributes-grid">
          <div className="attr-item">
            <span className="attr-lbl">Requested:</span>
            <strong>{requestedQuantity} {requestedUnit}</strong>
          </div>

          <div className="attr-item">
            <span className="attr-lbl">Available Supply:</span>
            {listing.isPartialMatch ? (
              <strong className="text-rose">
                Partial Match ({listing.quantityAvailable} {listing.unit} available)
              </strong>
            ) : (
              <strong className="text-emerald">
                {listing.quantityAvailable} {listing.unit} available
              </strong>
            )}
          </div>

          <div className="attr-item">
            <span className="attr-lbl">Quality:</span>
            <strong>{listing.quality || 'Grade A'}</strong>
          </div>

          <div className="attr-item">
            <span className="attr-lbl">Harvest Info:</span>
            <span>
              <ClockIcon size={12} color="#059669" />{' '}
              {listing.harvestDate === '2026-09-13' || listing.harvestDate === '2026-09-15'
                ? 'Fresh Today'
                : listing.harvestDate
                ? `Harvested ${listing.harvestDate}`
                : 'Field Fresh'}
            </span>
          </div>
        </div>

        {/* Why This Farmer? Section */}
        {reasons.length > 0 && (
          <div className="why-recommended-box">
            <button
              type="button"
              className="why-toggle-btn"
              onClick={() => setShowReasons(!showReasons)}
            >
              <div className="why-title">
                <SparklesIcon size={14} color="#059669" />
                <strong>Why this farmer?</strong>
              </div>
              <span className="toggle-chevron">{showReasons ? '▲' : '▼'}</span>
            </button>

            {showReasons && (
              <ul className="why-reasons-list">
                {reasons.map((r, idx) => (
                  <li key={idx} className="reason-item">
                    <span className="reason-icon">{r.icon}</span>
                    <span className="reason-text">{r.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {listing.description && (
          <p className="farmer-desc-text">"{listing.description}"</p>
        )}

        {/* Action buttons */}
        <div className="tier-card-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/farmer/${listing.farmerId || listing.farmer_id}`)}
          >
            View Farmer Profile
          </button>
          {onViewOnMap && hasValidLocation && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onViewOnMap(listing)}
            >
              📍 Focus on Map
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1"
            onClick={() =>
              navigate(`/order/${listing.id}`, {
                state: { listing, quantity: requestedQuantity, unit: requestedUnit },
              })
            }
          >
            <span>Buy {requestedQuantity} {requestedUnit}</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
