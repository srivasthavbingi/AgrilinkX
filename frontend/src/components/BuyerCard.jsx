import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  MapPinIcon,
  TruckIcon,
  PhoneIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from './Icons';

export default function BuyerCard({ buyer, onSelect }) {
  const navigate = useNavigate();

  return (
    <div className="buyer-card card">
      {/* Header */}
      <div className="buyer-header">
        <div className="buyer-meta">
          <div className="buyer-title-row">
            <h4 className="buyer-name">{buyer.name}</h4>
            {buyer.verified && (
              <span className="badge badge-emerald verified-badge" title="Verified Institutional Buyer">
                <ShieldCheckIcon size={13} color="#059669" />
                Verified
              </span>
            )}
          </div>
          <div className="buyer-sub">
            <span className="buyer-company">{buyer.company}</span>
            <span className="bullet-sep">•</span>
            <span className="buyer-rating">★ {buyer.rating} ({buyer.dealsCompleted} deals)</span>
          </div>
        </div>
      </div>

      {/* Offer Banner */}
      <div className="buyer-offer-banner">
        <div className="offer-col">
          <span className="offer-caption">Current Buy Quote</span>
          <div className="offer-price-wrap">
            <span className="offer-price">₹{buyer.offerPrice.toFixed(2)}</span>
            <span className="offer-unit">/ kg</span>
          </div>
        </div>
        <div className="offer-col right">
          <span className="offer-caption">Min Requirement</span>
          <span className="min-quantity">{buyer.minQuantityKg} kg</span>
        </div>
      </div>

      {/* Attributes */}
      <div className="buyer-details-list">
        <div className="detail-item">
          <MapPinIcon size={14} color="#64748b" />
          <span>
            {buyer.location} ({buyer.distanceKm} km away)
          </span>
        </div>
        <div className="detail-item">
          <TruckIcon size={14} color="#64748b" />
          <span>{buyer.transportAssistance}</span>
        </div>
        <div className="detail-item">
          <CheckCircleIcon size={14} color="#059669" />
          <span className="terms-highlight">{buyer.paymentTerms}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="buyer-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm btn-phone"
          onClick={() => alert(`Calling Buyer Support: ${buyer.phone}`)}
          title={buyer.phone}
        >
          <PhoneIcon size={14} />
          <span>Call Hub</span>
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm flex-1"
          onClick={() => {
            if (onSelect) onSelect(buyer);
            else navigate('/transaction', { state: { buyer } });
          }}
        >
          <span>Initiate Deal</span>
          <ArrowRightIcon size={14} />
        </button>
      </div>
    </div>
  );
}
