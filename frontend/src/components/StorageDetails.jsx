import React, { useState } from 'react';
import {
  WarehouseIcon,
  SnowflakeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  PhoneIcon,
  CalendarIcon,
  ArrowRightIcon,
  XIcon,
} from './Icons';

export default function StorageDetails({
  storage,
  activeLot,
  onClose,
  onConfirmStorage,
}) {
  const [durationDays, setDurationDays] = useState(5);
  const [lotQuantity, setLotQuantity] = useState(activeLot?.quantityKg || 1000);

  if (!storage) return null;

  const isCold = storage.type === 'Cold Storage';
  const totalCost = Math.round(storage.pricePerKgPerDay * lotQuantity * durationDays);

  return (
    <div className="modal-overlay">
      <div className="modal-dialog card storage-details-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-tag-row">
              <span className={`badge ${isCold ? 'badge-blue' : 'badge-gold'}`}>
                {storage.type}
              </span>
              {storage.verified && (
                <span className="badge badge-emerald">
                  <ShieldCheckIcon size={12} /> Verified WDRA Facility
                </span>
              )}
            </div>
            <h3 className="modal-title">{storage.name}</h3>
            <span className="modal-address">
              <MapPinIcon size={13} color="#64748b" />
              {storage.address} ({storage.distance} km from your farm)
            </span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        {/* Technical Specs Grid */}
        <div className="specs-grid">
          <div className="spec-card">
            <span className="lbl">Total Capacity</span>
            <strong>{storage.totalCapacity.toLocaleString()} Tons</strong>
          </div>
          <div className="spec-card">
            <span className="lbl">Available Space</span>
            <strong className="text-emerald">{storage.availableCapacity.toLocaleString()} Tons</strong>
          </div>
          <div className="spec-card">
            <span className="lbl">Climate / Temp</span>
            <strong>{storage.temperatureControlled ? storage.tempRange : 'Ambient Aerated'}</strong>
          </div>
          <div className="spec-card">
            <span className="lbl">Chambers & Zones</span>
            <strong>{storage.chambersCount} Chambers</strong>
          </div>
          <div className="spec-card">
            <span className="lbl">Humidity Control</span>
            <strong>{storage.humidityControl}</strong>
          </div>
          <div className="spec-card">
            <span className="lbl">Security Deposit</span>
            <strong>{storage.securityDeposit}</strong>
          </div>
        </div>

        {/* Supported Crops */}
        <div className="supported-crops-box">
          <span className="lbl">Approved Supported Crops:</span>
          <div className="crops-pill-list">
            {storage.supportedCrops.map((c, idx) => (
              <span key={idx} className="crop-pill">
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Storage Fee Estimator */}
        <div className="storage-estimator-box">
          <h4 className="estimator-title">Calculate Storage Holding Cost</h4>
          <div className="estimator-inputs">
            <div className="estimator-field">
              <label>Crop Quantity (kg)</label>
              <input
                type="number"
                value={lotQuantity}
                onChange={(e) => setLotQuantity(Number(e.target.value))}
                min="100"
              />
            </div>
            <div className="estimator-field">
              <label>Duration (Days): <strong>{durationDays} Days</strong></label>
              <input
                type="range"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>

          <div className="estimator-summary">
            <div className="summary-line">
              <span>Daily Rate: ₹{storage.pricePerKgPerDay}/kg/day × {lotQuantity} kg</span>
              <span>₹{(storage.pricePerKgPerDay * lotQuantity).toFixed(2)}/day</span>
            </div>
            <div className="summary-total">
              <span>Total Estimated Storage Fee ({durationDays} Days):</span>
              <strong className="text-emerald">₹{totalCost.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => alert(`Calling Facility Manager: ${storage.contact}`)}
          >
            <PhoneIcon size={15} />
            <span>Call Facility: {storage.contact}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (onConfirmStorage) onConfirmStorage(storage, lotQuantity, durationDays);
              else {
                alert(`Chamber reserved for ${lotQuantity} kg at ${storage.name}!`);
                onClose();
              }
            }}
          >
            <span>Confirm Storage Chamber Reservation</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
