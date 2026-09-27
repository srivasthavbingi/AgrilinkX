import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PlusIcon,
  SproutIcon,
  ScaleIcon,
  CalendarIcon,
  MapPinIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XIcon,
} from '../components/Icons';
import { cropLotsList, activeCropLot } from '../data/mockData';

export default function CropLot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [lots, setLots] = useState(cropLotsList);
  const [showModal, setShowModal] = useState(location.state?.openModal || false);

  // New lot form state
  const [newLot, setNewLot] = useState({
    cropName: 'Cotton',
    variety: 'Bt Cotton Long Staple',
    quantityKg: '1500',
    harvestDate: '2026-09-14',
    qualityGrade: 'Grade A',
    moisturePercent: '8%',
    location: 'Shamshabad, Rangareddy',
  });

  const handleCreateLot = (e) => {
    e.preventDefault();
    const created = {
      id: `LOT-${newLot.cropName.slice(0, 3).toUpperCase()}-2026-${Math.floor(100 + Math.random() * 900)}`,
      cropName: newLot.cropName,
      variety: newLot.variety,
      quantityKg: Number(newLot.quantityKg),
      harvestDate: newLot.harvestDate,
      qualityGrade: newLot.qualityGrade,
      status: 'Active',
      estimatedValue: `₹${(Number(newLot.quantityKg) * 65).toLocaleString()}`,
      bestMarket: 'Warangal',
    };
    setLots([created, ...lots]);
    setShowModal(false);
  };

  return (
    <div className="page-wrapper">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Crop Lots</h1>
          <p className="page-subtitle">
            Register, track, and optimize selling decisions for your harvested agricultural lots.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <PlusIcon size={18} />
          <span>Add New Crop Lot</span>
        </button>
      </div>

      {/* Primary Highlight Card for Current Active Lot */}
      <div className="active-lot-banner card">
        <div className="active-lot-badge">
          <SparklesIcon size={14} color="#059669" />
          <span>Currently Selected for AI Recommendation</span>
        </div>
        <div className="active-lot-content">
          <div className="active-lot-info">
            <h2 className="active-lot-name">
              {activeCropLot.cropName} — {activeCropLot.variety}
            </h2>
            <div className="active-lot-meta-tags">
              <span className="badge badge-emerald">Lot ID: {activeCropLot.id}</span>
              <span className="badge badge-blue">
                {activeCropLot.quantityKg} kg ({activeCropLot.quantityQuintals} Quintals)
              </span>
              <span className="badge badge-gold">{activeCropLot.qualityGrade}</span>
              <span className="lot-loc">
                <MapPinIcon size={13} color="#64748b" /> {activeCropLot.location}
              </span>
            </div>
          </div>
          <div className="active-lot-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/recommendation')}
            >
              <span>Analyze Best Market</span>
              <ArrowRightIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Lots Grid */}
      <div className="section-block">
        <h3 className="section-title">All Registered Lots ({lots.length})</h3>
        <div className="lots-grid">
          {lots.map((lot) => (
            <div key={lot.id} className="lot-card card">
              <div className="lot-card-top">
                <div className="lot-icon-circle">
                  <SproutIcon size={20} color="#059669" />
                </div>
                <div className="lot-headings">
                  <h4 className="lot-name">{lot.cropName}</h4>
                  <span className="lot-variety">{lot.variety}</span>
                </div>
                <span className="badge badge-emerald">{lot.status}</span>
              </div>

              <div className="lot-metrics-table">
                <div className="lot-metric-item">
                  <span className="lbl">Quantity:</span>
                  <strong>{lot.quantityKg.toLocaleString()} kg</strong>
                </div>
                <div className="lot-metric-item">
                  <span className="lbl">Harvest Date:</span>
                  <span>{lot.harvestDate}</span>
                </div>
                <div className="lot-metric-item">
                  <span className="lbl">Quality Grade:</span>
                  <span>{lot.qualityGrade}</span>
                </div>
                <div className="lot-metric-item">
                  <span className="lbl">Est. Realization:</span>
                  <strong className="text-emerald">{lot.estimatedValue}</strong>
                </div>
                <div className="lot-metric-item">
                  <span className="lbl">AI Top Mandi:</span>
                  <span>{lot.bestMarket}</span>
                </div>
              </div>

              <div className="lot-card-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm w-full"
                  onClick={() => navigate('/markets', { state: { cropLot: lot } })}
                >
                  <span>Compare Mandis for this Lot</span>
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Crop Lot Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-dialog card">
            <div className="modal-header">
              <h3>Register New Crop Lot</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowModal(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLot} className="modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Crop Name</label>
                  <select
                    value={newLot.cropName}
                    onChange={(e) => setNewLot({ ...newLot, cropName: e.target.value })}
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Chilli">Guntur Chilli</option>
                    <option value="Onion">Onion</option>
                    <option value="Paddy">Paddy / Rice</option>
                    <option value="Turmeric">Turmeric</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Variety / Seed Type</label>
                  <input
                    type="text"
                    value={newLot.variety}
                    onChange={(e) => setNewLot({ ...newLot, variety: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Harvest Quantity (kg)</label>
                  <input
                    type="number"
                    value={newLot.quantityKg}
                    onChange={(e) => setNewLot({ ...newLot, quantityKg: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Harvest Date</label>
                  <input
                    type="date"
                    value={newLot.harvestDate}
                    onChange={(e) => setNewLot({ ...newLot, harvestDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Quality Grade</label>
                  <select
                    value={newLot.qualityGrade}
                    onChange={(e) => setNewLot({ ...newLot, qualityGrade: e.target.value })}
                  >
                    <option value="Grade A+">Grade A+ (Premium Export/Retail)</option>
                    <option value="Grade A">Grade A (Firm, Glossy, Standard)</option>
                    <option value="Grade B">Grade B (Processing Quality)</option>
                    <option value="Grade C">Grade C (Local Consumption)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Moisture Content (%)</label>
                  <input
                    type="text"
                    value={newLot.moisturePercent}
                    onChange={(e) => setNewLot({ ...newLot, moisturePercent: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Farm Location / Village</label>
                <input
                  type="text"
                  value={newLot.location}
                  onChange={(e) => setNewLot({ ...newLot, location: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Register Lot & Match Mandis</span>
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
