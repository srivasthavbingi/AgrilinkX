import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import {
  ScaleIcon,
  FilterIcon,
  TruckIcon,
  MapPinIcon,
  SparklesIcon,
  ArrowRightIcon,
  TrendingUpIcon,
} from '../components/Icons';
import { marketsData, activeCropLot } from '../data/mockData';
import { logisticsService } from '../services/logisticsService';

export default function Markets() {
  const navigate = useNavigate();
  const [maxDistance, setMaxDistance] = useState(200);
  const [sortBy, setSortBy] = useState('netRealization'); // 'netRealization', 'distance', 'modalPrice'
  const [vehicleType, setVehicleType] = useState('mini-truck'); // 'mini-truck', 'pickup'

  // Recalculate transport and net realization if vehicle type changed
  const computedMarkets = useMemo(() => {
    return marketsData
      .map((mkt) => {
        const freight = logisticsService.estimateTransportCost(
          mkt.distance,
          activeCropLot.quantityKg,
          vehicleType
        );
        const transportCost = freight.estimatedCost;
        const gross = mkt.modalPrice * activeCropLot.quantityKg;
        const net = gross - transportCost - mkt.handlingFee;
        return {
          ...mkt,
          transportCost,
          expectedNetRealization: net,
          expectedNetPerKg: (net / activeCropLot.quantityKg).toFixed(1),
        };
      })
      .filter((mkt) => mkt.distance <= maxDistance)
      .sort((a, b) => {
        if (sortBy === 'netRealization') return b.expectedNetRealization - a.expectedNetRealization;
        if (sortBy === 'distance') return a.distance - b.distance;
        if (sortBy === 'modalPrice') return b.modalPrice - a.modalPrice;
        return 0;
      });
  }, [maxDistance, sortBy, vehicleType]);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mandi Price Comparison & Logistics Engine</h1>
          <p className="page-subtitle">
            Compare regional wholesale APMC mandis with automated transport cost deductions for your{' '}
            <strong>{activeCropLot.cropName} ({activeCropLot.quantityKg} kg)</strong> lot.
          </p>
        </div>
      </div>

      {/* Filter and Simulator Toolbar */}
      <div className="mandi-toolbar card">
        <div className="filter-group">
          <label className="filter-label">
            <MapPinIcon size={14} color="#059669" /> Max Distance Radius: <strong>{maxDistance} km</strong>
          </label>
          <input
            type="range"
            min="20"
            max="200"
            step="10"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="slider-input"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <TruckIcon size={14} color="#059669" /> Logistics Vehicle:
          </label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="select-input"
          >
            <option value="mini-truck">Tata Ace (Up to 1.2 Ton)</option>
            <option value="pickup">Mahindra Bolero Maxx (Up to 2 Ton)</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <FilterIcon size={14} color="#059669" /> Sort Mandis By:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select-input"
          >
            <option value="netRealization">Highest Expected Net Realization</option>
            <option value="modalPrice">Highest Market Price (₹/kg)</option>
            <option value="distance">Shortest Distance (km)</option>
          </select>
        </div>
      </div>

      {/* Comparison Summary Table */}
      <div className="section-block">
        <div className="table-responsive card">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Mandi Name</th>
                <th>Distance</th>
                <th>Market Price</th>
                <th>Price Range</th>
                <th>Demand Level</th>
                <th>Est. Transport</th>
                <th>Expected Net Realization</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {computedMarkets.map((mkt) => (
                <tr key={mkt.id} className={mkt.isRecommended ? 'highlight-row' : ''}>
                  <td>
                    <div className="mandi-name-cell">
                      <strong>{mkt.name}</strong>
                      {mkt.isRecommended && (
                        <span className="badge badge-gold">AI Recommended</span>
                      )}
                      <span className="sub-city">{mkt.city}</span>
                    </div>
                  </td>
                  <td>
                    <span>{mkt.distance} km</span>
                    <span className="sub-val">{mkt.osrmDurationMinutes} min</span>
                  </td>
                  <td>
                    <strong className="text-emerald">₹{mkt.modalPrice}/kg</strong>
                  </td>
                  <td>
                    ₹{mkt.minPrice} - ₹{mkt.maxPrice}
                  </td>
                  <td>
                    <span className={`badge badge-${mkt.demandColor || 'emerald'}`}>
                      {mkt.demand}
                    </span>
                  </td>
                  <td>
                    <span>₹{mkt.transportCost.toLocaleString()}</span>
                    <span className="sub-val">({vehicleType})</span>
                  </td>
                  <td>
                    <div className="net-table-cell">
                      <strong>₹{mkt.expectedNetRealization.toLocaleString()}</strong>
                      <span className="net-sub">(₹{mkt.expectedNetPerKg}/kg net)</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/recommendation', { state: { selectedMarket: mkt } })}
                    >
                      <span>Select</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid of Mandi Cards */}
      <div className="section-block">
        <h3 className="section-title">Mandi Cards View</h3>
        <div className="market-cards-grid">
          {computedMarkets.map((mkt) => (
            <MarketCard
              key={mkt.id}
              market={mkt}
              quantityKg={activeCropLot.quantityKg}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
