import React, { useState, useMemo } from 'react';
import AgriMap from '../components/AgriMap';
import StorageCard from '../components/StorageCard';
import StorageDetails from '../components/StorageDetails';
import StoreSellDecision from '../components/StoreSellDecision';
import {
  MapPinIcon,
  FilterIcon,
  SnowflakeIcon,
  WarehouseIcon,
  NavigationIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TruckIcon,
  ScaleIcon,
  ArrowRightIcon,
} from '../components/Icons';
import {
  farmerLocation,
  storageFacilities,
  mapMarkets,
  mapBuyers,
} from '../data/storageData';
import { activeCropLot, marketsData } from '../data/mockData';
import { logisticsService } from '../services/logisticsService';

export default function StorageMap() {
  // Filter state
  const [selectedCrop, setSelectedCrop] = useState(activeCropLot.cropName);
  const [quantityKg, setQuantityKg] = useState(activeCropLot.quantityKg);
  const [searchRadius, setSearchRadius] = useState(50);
  const [storageType, setStorageType] = useState('all'); // 'all', 'Cold Storage', 'Warehouse'
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tempControlledOnly, setTempControlledOnly] = useState(false);

  // Selection state
  const [selectedFacility, setSelectedFacility] = useState(storageFacilities[1]); // Default GMR Aero Cold Storage
  const [detailModalFacility, setDetailModalFacility] = useState(null);

  // Compute filtered storages
  const filteredStorages = useMemo(() => {
    return storageFacilities.filter((stg) => {
      const matchCrop =
        !selectedCrop ||
        stg.supportedCrops.some((c) => c.toLowerCase().includes(selectedCrop.toLowerCase()));
      const matchRadius = stg.distance <= searchRadius;
      const matchType =
        storageType === 'all' || stg.type.toLowerCase().includes(storageType.toLowerCase());
      const matchVerified = !verifiedOnly || stg.verified;
      const matchTemp = !tempControlledOnly || stg.temperatureControlled;

      return matchCrop && matchRadius && matchType && matchVerified && matchTemp;
    });
  }, [selectedCrop, searchRadius, storageType, verifiedOnly, tempControlledOnly]);

  // Compute active route between Farmer and selected destination
  const activeRoute = useMemo(() => {
    if (!selectedFacility) return null;
    return logisticsService.getRoute(
      farmerLocation,
      selectedFacility,
      quantityKg,
      'mini-truck'
    );
  }, [selectedFacility, quantityKg]);

  const handleSelectDestination = (destination, type = 'storage') => {
    setSelectedFacility(destination);
  };

  return (
    <div className="page-wrapper storage-page-wrapper">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div className="page-tag-row">
            <span className="badge badge-emerald">Spatial Intelligence & Logistics</span>
            <span className="badge badge-blue">OpenStreetMap Integration</span>
          </div>
          <h1 className="page-title">Markets & Storage Facilities Explorer</h1>
          <p className="page-subtitle">
            Locate regional cold storage chambers, warehouses, APMC mandis, and verified buyers with real-time freight and holding cost calculations.
          </p>
        </div>
      </div>

      {/* Main Dual Panel Layout */}
      <div className="storage-dual-layout">
        {/* LEFT PANEL: Filters & Controls */}
        <div className="storage-filter-panel card">
          <div className="filter-panel-header">
            <FilterIcon size={18} color="#059669" />
            <h3 className="panel-title">Search & Lot Filters</h3>
          </div>

          <div className="panel-form-group">
            <label className="field-label">Produce Crop</label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="select-input w-full"
            >
              <option value="Tomato">Tomato (Hybrid Red)</option>
              <option value="Chilli">Guntur Chilli</option>
              <option value="Onion">Nashik Onion</option>
              <option value="Cotton">Cotton</option>
              <option value="Paddy">Paddy / Rice</option>
            </select>
          </div>

          <div className="panel-form-group">
            <label className="field-label">Quantity to Store / Move (kg)</label>
            <input
              type="number"
              value={quantityKg}
              onChange={(e) => setQuantityKg(Number(e.target.value))}
              min="100"
              step="100"
              className="number-input w-full"
            />
          </div>

          <div className="panel-form-group">
            <div className="slider-header-row">
              <label className="field-label">Search Radius</label>
              <strong className="text-emerald">{searchRadius} km</strong>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="slider-input w-full"
            />
            <span className="slider-range-sub">10 km (Local) ➔ 150 km (Regional)</span>
          </div>

          <div className="panel-form-group">
            <label className="field-label">Storage Facility Type</label>
            <div className="type-buttons-group">
              <button
                type="button"
                className={`type-btn ${storageType === 'all' ? 'active' : ''}`}
                onClick={() => setStorageType('all')}
              >
                All Types
              </button>
              <button
                type="button"
                className={`type-btn ${storageType === 'Cold Storage' ? 'active' : ''}`}
                onClick={() => setStorageType('Cold Storage')}
              >
                Cold Chain
              </button>
              <button
                type="button"
                className={`type-btn ${storageType === 'Warehouse' ? 'active' : ''}`}
                onClick={() => setStorageType('Warehouse')}
              >
                Warehouse
              </button>
            </div>
          </div>

          <div className="panel-form-group toggles-group">
            <label className="checkbox-toggle">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              <span className="checkbox-label">
                <ShieldCheckIcon size={14} color="#059669" />
                Verified & Insured Only
              </span>
            </label>

            <label className="checkbox-toggle">
              <input
                type="checkbox"
                checked={tempControlledOnly}
                onChange={(e) => setTempControlledOnly(e.target.checked)}
              />
              <span className="checkbox-label">
                <SnowflakeIcon size={14} color="#0284c7" />
                Temperature Controlled (2-8°C)
              </span>
            </label>
          </div>

          {/* Quick Active Selection Card in Left Panel */}
          {selectedFacility && (
            <div className="active-selection-summary">
              <span className="selection-caption">Selected Facility for Route:</span>
              <strong className="facility-selected-name">{selectedFacility.name}</strong>
              <div className="route-stat-lines">
                <div>Distance: <strong>{selectedFacility.distance} km</strong></div>
                <div>Freight: <strong>₹{activeRoute?.estimatedCost?.toLocaleString() || '800'}</strong></div>
                <div>Duration: <strong>{activeRoute?.estimatedDuration || '25 min'}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Interactive Leaflet Map */}
        <div className="storage-map-panel">
          {/* Active Route Top Banner */}
          {activeRoute && (
            <div className="active-route-strip card">
              <div className="route-strip-left">
                <div className="route-icon-box">
                  <TruckIcon size={18} color="#ffffff" />
                </div>
                <div>
                  <div className="route-title">
                    <span>Origin: <strong>{activeRoute.originName.split("'")[0]}</strong></span>
                    <span className="route-arrow">➔</span>
                    <span>Destination: <strong>{activeRoute.destinationName}</strong></span>
                  </div>
                  <span className="route-specs">
                    OSRM Mock Highway Transit • Mini-Truck (Tata Ace) • {quantityKg} kg
                  </span>
                </div>
              </div>

              <div className="route-strip-metrics">
                <div className="metric-pill">
                  <span className="lbl">Distance</span>
                  <strong>{activeRoute.distanceKm} km</strong>
                </div>
                <div className="metric-pill">
                  <span className="lbl">Est. Time</span>
                  <strong>{activeRoute.estimatedDuration}</strong>
                </div>
                <div className="metric-pill highlight">
                  <span className="lbl">Est. Freight</span>
                  <strong>₹{activeRoute.estimatedCost.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Leaflet Map Component */}
          <AgriMap
            farmer={farmerLocation}
            storages={filteredStorages}
            markets={mapMarkets}
            buyers={mapBuyers}
            selectedDestination={selectedFacility}
            activeRoute={activeRoute}
            onSelectStorage={handleSelectDestination}
            onViewDetails={(stg) => setDetailModalFacility(stg)}
            onStoreCrop={(stg) => {
              setSelectedFacility(stg);
              // scroll to decision
              document.getElementById('decision-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            height="520px"
          />

          {/* Map Legend */}
          <div className="map-legend-strip card">
            <div className="legend-entry">
              <span className="legend-pin pin-farmer">🚜</span>
              <span>Your Farm (Shamshabad)</span>
            </div>
            <div className="legend-entry">
              <span className="legend-pin pin-mandi">🏛️</span>
              <span>APMC Mandis (4)</span>
            </div>
            <div className="legend-entry">
              <span className="legend-pin pin-storage">❄️</span>
              <span>Cold Storages</span>
            </div>
            <div className="legend-entry">
              <span className="legend-pin pin-warehouse">🏢</span>
              <span>Warehouses</span>
            </div>
            <div className="legend-entry">
              <span className="legend-pin pin-buyer">🤝</span>
              <span>Verified Buyers (3)</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAJOR SECTION 10: AI STORE VS SELL DECISION */}
      <section id="decision-section" className="section-block mt-4">
        <StoreSellDecision
          cropLot={{ ...activeCropLot, quantityKg }}
          selectedStorage={selectedFacility || storageFacilities[1]}
          targetMandi={marketsData[0]}
        />
      </section>

      {/* SECTION 6: Nearby Storage Facilities Cards Grid */}
      <section className="section-block mt-4">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">Nearby Storage Facilities ({filteredStorages.length})</h3>
            <p className="section-sub">
              Available facilities within {searchRadius} km supporting {selectedCrop}
            </p>
          </div>
        </div>

        <div className="storage-cards-grid">
          {filteredStorages.map((storage) => (
            <StorageCard
              key={storage.id}
              storage={storage}
              isSelected={selectedFacility?.id === storage.id}
              onSelect={(stg) => handleSelectDestination(stg, 'storage')}
              onViewDetails={(stg) => setDetailModalFacility(stg)}
              onStoreCrop={(stg) => {
                setSelectedFacility(stg);
                document.getElementById('decision-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      </section>

      {/* Storage Details Modal */}
      {detailModalFacility && (
        <StorageDetails
          storage={detailModalFacility}
          activeLot={{ ...activeCropLot, quantityKg }}
          onClose={() => setDetailModalFacility(null)}
          onConfirmStorage={(stg, qty, days) => {
            setSelectedFacility(stg);
            setDetailModalFacility(null);
            alert(`Reserved chamber at ${stg.name} for ${qty} kg across ${days} days!`);
          }}
        />
      )}
    </div>
  );
}
