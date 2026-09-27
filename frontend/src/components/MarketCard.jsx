import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  TruckIcon,
  SparklesIcon,
  ArrowRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from './Icons';

export default function MarketCard({
  market,
  quantityKg = 1000,
  onSelect,
  isSelected = false,
}) {
  const navigate = useNavigate();

  const getDemandBadge = (demand) => {
    switch (demand) {
      case 'Very High':
      case 'High':
        return 'badge-emerald';
      case 'Medium':
        return 'badge-gold';
      default:
        return 'badge-rose';
    }
  };

  return (
    <div
      className={`market-card card ${market.isRecommended ? 'recommended-glow' : ''} ${
        isSelected ? 'selected-border' : ''
      }`}
    >
      {/* Badges bar */}
      <div className="market-card-top">
        <div className="market-location-info">
          <h4 className="market-name">{market.name}</h4>
          <span className="market-city">
            <MapPinIcon size={13} color="#64748b" />
            {market.city} • {market.distance} km
          </span>
        </div>
        <div className="market-tags">
          {market.isRecommended && (
            <span className="badge badge-gold ai-choice-tag">
              <SparklesIcon size={12} color="#b45309" />
              AI Top Pick
            </span>
          )}
          <span className={`badge ${getDemandBadge(market.demand)}`}>
            {market.demand} Demand
          </span>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="market-pricing-row">
        <div className="pricing-box">
          <span className="price-label">Market Price</span>
          <span className="price-value">₹{market.modalPrice}</span>
          <span className="price-unit">per kg</span>
        </div>
        <div className="pricing-box secondary">
          <span className="price-label">Price Range</span>
          <span className="price-range">
            ₹{market.minPrice} - ₹{market.maxPrice}
          </span>
          <span className="price-unit">min - max</span>
        </div>
        <div className="pricing-box secondary">
          <span className="price-label">Est. Transport</span>
          <span className="price-transport">₹{market.transportCost.toLocaleString()}</span>
          <span className="price-unit">Tata Ace ({market.osrmDurationMinutes} min)</span>
        </div>
      </div>

      {/* Expected Net Realization Highlight */}
      <div className="net-realization-banner">
        <div className="net-realization-text">
          <span className="net-label">Expected Net Realization</span>
          <span className="net-calc-sub">({quantityKg} kg lot after transport & cess)</span>
        </div>
        <div className="net-realization-figure">
          <span className="net-amount">₹{market.expectedNetRealization.toLocaleString()}</span>
          <span className="net-per-kg">(₹{market.expectedNetPerKg}/kg net)</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="market-card-actions">
        <button
          type="button"
          className={`btn ${market.isRecommended ? 'btn-primary' : 'btn-outline'} btn-sm w-full`}
          onClick={() => {
            if (onSelect) onSelect(market);
            else navigate('/recommendation', { state: { selectedMarket: market } });
          }}
        >
          <span>Choose Mandi</span>
          <ArrowRightIcon size={15} />
        </button>
      </div>
    </div>
  );
}
