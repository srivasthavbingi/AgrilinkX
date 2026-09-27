import React from 'react';
import {
  WarehouseIcon,
  SnowflakeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  NavigationIcon,
  ArrowRightIcon,
} from './Icons';

export default function StorageCard({
  storage,
  isSelected = false,
  onSelect,
  onViewDetails,
  onStoreCrop,
}) {
  const isCold = storage.type === 'Cold Storage';
  const occupancyPct = Math.round(
    ((storage.totalCapacity - storage.availableCapacity) / storage.totalCapacity) * 100
  );

  return (
    <div
      className={`storage-card card ${isSelected ? 'selected-storage-glow' : ''}`}
      onClick={() => onSelect && onSelect(storage)}
    >
      {/* Header */}
      <div className="storage-card-header">
        <div className="storage-type-wrap">
          <div className={`storage-icon-circle ${isCold ? 'icon-cold' : 'icon-warehouse'}`}>
            {isCold ? <SnowflakeIcon size={18} /> : <WarehouseIcon size={18} />}
          </div>
          <div>
            <h4 className="storage-name">{storage.name}</h4>
            <span className="storage-address">
              <MapPinIcon size={12} color="#64748b" />
              {storage.distance} km away • {storage.address.split(',')[0]}
            </span>
          </div>
        </div>

        <div className="storage-badges">
          <span className={`badge ${isCold ? 'badge-blue' : 'badge-gold'}`}>
            {storage.type}
          </span>
          {storage.verified && (
            <span className="badge badge-emerald">
              <ShieldCheckIcon size={12} /> Verified
            </span>
          )}
        </div>
      </div>

      {/* Pricing and Capacity Strip */}
      <div className="storage-metrics-row">
        <div className="storage-metric-box">
          <span className="lbl">Daily Storage Rate</span>
          <div className="rate-val">
            <strong>₹{storage.pricePerKgPerDay}</strong>
            <span className="unit">/ kg / day</span>
          </div>
        </div>

        <div className="storage-metric-box">
          <span className="lbl">Rating & Trust</span>
          <div className="rating-val">
            ★ {storage.rating} <span className="sub">(Govt Reg.)</span>
          </div>
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="capacity-bar-wrap">
        <div className="capacity-labels">
          <span>Available Space: <strong>{storage.availableCapacity.toLocaleString()} Tons</strong></span>
          <span className="occ-pct">{occupancyPct}% Booked</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${occupancyPct}%`,
              backgroundColor: occupancyPct > 85 ? '#e11d48' : '#059669',
            }}
          ></div>
        </div>
      </div>

      {/* Features */}
      <div className="storage-features">
        <div className="feature-chip">
          {storage.temperatureControlled ? (
            <>
              <SnowflakeIcon size={13} color="#0284c7" />
              <span>{storage.tempRange || 'Controlled 2-8°C'}</span>
            </>
          ) : (
            <>
              <WarehouseIcon size={13} color="#64748b" />
              <span>Ventilated Dry Silo</span>
            </>
          )}
        </div>

        <div className="feature-chip">
          <CheckCircleIcon size={13} color="#059669" />
          <span>{storage.humidityControl}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="storage-card-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            if (onViewDetails) onViewDetails(storage);
          }}
        >
          View Details
        </button>

        <button
          type="button"
          className="btn btn-primary btn-sm flex-1"
          onClick={(e) => {
            e.stopPropagation();
            if (onStoreCrop) onStoreCrop(storage);
            else if (onSelect) onSelect(storage);
          }}
        >
          <NavigationIcon size={14} />
          <span>Route / Store Crop</span>
        </button>
      </div>
    </div>
  );
}
