import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import MarketCard from '../components/MarketCard';
import BuyerCard from '../components/BuyerCard';
import PriceChart from '../components/PriceChart';
import RecommendationCard from '../components/RecommendationCard';
import DemandBadge from '../components/DemandBadge';
import farmerIntelligenceService from '../services/farmerIntelligenceService';
import {
  SproutIcon,
  ScaleIcon,
  TrendingUpIcon,
  DollarSignIcon,
  PlusIcon,
  UsersIcon,
  ArrowRightIcon,
  CalendarIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TruckIcon,
  SparklesIcon,
  WarehouseIcon,
  SnowflakeIcon,
  PackageIcon,
  ShoppingCartIcon,
  IndianRupeeIcon,
} from '../components/Icons';
import {
  currentFarmer,
  activeCropLot,
  marketsData,
  priceTrendData,
  aiRecommendation,
  verifiedBuyersData,
} from '../data/mockData';
import { storageFacilities } from '../data/storageData';

export default function Dashboard() {
  const navigate = useNavigate();

  // ── Real market intelligence summary ──────────────────────────────────────
  const [miData, setMiData] = useState(null);
  const [miLoading, setMiLoading] = useState(true);

  useEffect(() => {
    farmerIntelligenceService.getMarketIntelligence()
      .then(data => setMiData(data))
      .catch(() => {}) // silently ignore; Dashboard still works with existing sections
      .finally(() => setMiLoading(false));
  }, []);

  const summary = miData?.summary;

  return (
    <div className="dashboard-container">
      {/* 1. Header Section */}
      <section className="dashboard-header">
        <div className="header-titles">
          <div className="greeting-row">
            <h1 className="header-greeting">Good morning, Farmer {currentFarmer.name.split(' ')[0]}</h1>
            <span className="badge badge-emerald">
              <SparklesIcon size={12} color="#059669" />
              Live Market Intelligence
            </span>
          </div>
          <p className="header-subtext">
            Make smarter selling decisions with real-time market intelligence.
          </p>
        </div>

        {/* Header Action / Lot Pill */}
        <div className="header-actions-group">
          <button
            type="button"
            className="btn btn-outline btn-sm btn-family-market"
            onClick={() => navigate('/')}
          >
            <span>🛒 View Family Marketplace</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm btn-explore-storage"
            onClick={() => navigate('/storage')}
          >
            <WarehouseIcon size={16} />
            <span>Explore Markets & Storage</span>
          </button>

          <div className="header-lot-pill card">
            <div className="pill-dot"></div>
            <div className="pill-text">
              <span className="pill-title">Active Lot Focus:</span>
              <strong className="pill-val">{activeCropLot.cropName} ({activeCropLot.quantityKg} kg)</strong>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/crop-lot')}
            >
              Change Lot
            </button>
          </div>
        </div>
      </section>

      {/* ── Real Market Intelligence Summary Banner ──────────────────────── */}
      <section className="mi-dashboard-banner card">
        <div className="mi-banner-top">
          <div>
            <h2 className="mi-banner-title">
              <SparklesIcon size={18} color="#10b981" /> Market Intelligence
            </h2>
            <p className="mi-banner-sub">Real data from your farm listings and orders</p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/market-intelligence')}
            type="button"
          >
            Open Full Dashboard <ArrowRightIcon size={14} />
          </button>
        </div>

        {miLoading ? (
          <div className="mi-banner-loading">Loading your live stats…</div>
        ) : !summary ? (
          <div className="mi-banner-empty">
            Add inventory listings to see your live market intelligence stats.
          </div>
        ) : (
          <div className="mi-banner-stats">
            <div className="mi-banner-stat">
              <PackageIcon size={20} color="#10b981" />
              <div>
                <span className="mi-bstat-val">{summary.total_inventory_qty} kg</span>
                <span className="mi-bstat-lbl">Total Inventory</span>
              </div>
            </div>
            <div className="mi-banner-stat">
              <ShoppingCartIcon size={20} color="#d97706" />
              <div>
                <span className="mi-bstat-val">{summary.pending_orders}</span>
                <span className="mi-bstat-lbl">Pending Orders</span>
              </div>
            </div>
            <div className="mi-banner-stat">
              <TrendingUpIcon size={20} color="#0284c7" />
              <div>
                <span className="mi-bstat-val">{summary.completed_orders}</span>
                <span className="mi-bstat-lbl">Completed Orders</span>
              </div>
            </div>
            <div className="mi-banner-stat">
              <IndianRupeeIcon size={20} color="#7c3aed" />
              <div>
                <span className="mi-bstat-val">₹{summary.total_revenue.toLocaleString()}</span>
                <span className="mi-bstat-lbl">Total Revenue</span>
              </div>
            </div>
            {miData?.price_opportunity_count > 0 && (
              <div className="mi-banner-stat mi-opportunity-stat">
                <span className="mi-bstat-val mi-opp-val">
                  {miData.price_opportunity_count} 💡
                </span>
                <span className="mi-bstat-lbl">Price Opportunities</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Top Statistics (4 Core Cards) */}
      <section className="dashboard-stats-grid">
        <StatCard
          title="Current Crop"
          value={activeCropLot.cropName}
          unit={`(${activeCropLot.variety.split(' ')[0]})`}
          subtitle={`Grade: ${activeCropLot.qualityGrade.split(' ')[0]} • Farm Hub`}
          icon={SproutIcon}
          color="emerald"
        />

        <StatCard
          title="Quantity Available"
          value={activeCropLot.quantityKg.toLocaleString()}
          unit="kg"
          subtitle={`${activeCropLot.quantityQuintals} Quintals • Ready for Dispatch`}
          icon={ScaleIcon}
          color="blue"
        />

        <StatCard
          title="Best Market Price"
          value="₹31.00"
          unit="/kg"
          subtitle="Bowenpally Mandi • Today's Modal"
          trend="+6.8% this week"
          trendType="up"
          icon={TrendingUpIcon}
          color="gold"
        />

        <StatCard
          title="Expected Net Revenue"
          value="₹28,500"
          unit="net"
          subtitle="After ₹2,500 transport deduction"
          trend="₹28.50/kg net realization"
          trendType="up"
          icon={DollarSignIcon}
          color="emerald"
          highlight={true}
        />
      </section>

      {/* 3. AI Recommendation Banner (Prominent Callout) */}
      <section className="section-block">
        <RecommendationCard
          recommendation={aiRecommendation}
          cropName={activeCropLot.cropName}
          quantityKg={activeCropLot.quantityKg}
        />
      </section>

      {/* 4. Crop Summary & Quick Actions Grid */}
      <section className="dashboard-grid-2col">
        {/* Section 1: Crop Summary */}
        <div className="dashboard-card card crop-summary-card">
          <div className="card-header-flex">
            <div>
              <h3 className="section-title">1. Active Crop Lot Summary</h3>
              <p className="section-sub">Details of your currently harvested produce</p>
            </div>
            <span className="badge badge-emerald">{activeCropLot.status}</span>
          </div>

          <div className="crop-details-table">
            <div className="crop-detail-row">
              <span className="row-label">Lot Identifier:</span>
              <strong className="row-value">{activeCropLot.id}</strong>
            </div>
            <div className="crop-detail-row">
              <span className="row-label">Crop & Variety:</span>
              <span className="row-value">{activeCropLot.cropName} — {activeCropLot.variety}</span>
            </div>
            <div className="crop-detail-row">
              <span className="row-label">Harvest Date & Shelf Life:</span>
              <span className="row-value">
                <CalendarIcon size={13} color="#64748b" /> {activeCropLot.harvestDate} ({activeCropLot.shelfLifeDays} days optimal)
              </span>
            </div>
            <div className="crop-detail-row">
              <span className="row-label">Moisture & Quality:</span>
              <span className="row-value">{activeCropLot.moisturePercent} Moisture • {activeCropLot.qualityGrade}</span>
            </div>
            <div className="crop-detail-row">
              <span className="row-label">Farm Location:</span>
              <span className="row-value">
                <MapPinIcon size={13} color="#64748b" /> {activeCropLot.location}
              </span>
            </div>
          </div>

          <div className="crop-card-footer">
            <button
              type="button"
              className="btn btn-outline btn-sm w-full"
              onClick={() => navigate('/crop-lot')}
            >
              <span>Manage All 3 Crop Lots</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>

        {/* Section 6: Quick Actions */}
        <div className="dashboard-card card quick-actions-card">
          <div className="card-header-flex">
            <div>
              <h3 className="section-title">6. Farmer Quick Actions</h3>
              <p className="section-sub">Fast shortcuts to optimize market decisions</p>
            </div>
          </div>

          <div className="quick-actions-list">
            <div
              className="quick-action-item action-add"
              onClick={() => navigate('/crop-lot', { state: { openModal: true } })}
            >
              <div className="action-icon-wrap">
                <PlusIcon size={20} color="#059669" />
              </div>
              <div className="action-info">
                <strong>Add Crop Lot</strong>
                <span>Register a new harvest for AI price matching</span>
              </div>
              <ArrowRightIcon size={16} color="#94a3b8" />
            </div>

            <div
              className="quick-action-item action-compare"
              onClick={() => navigate('/markets')}
            >
              <div className="action-icon-wrap">
                <ScaleIcon size={20} color="#0284c7" />
              </div>
              <div className="action-info">
                <strong>Compare Markets</strong>
                <span>Compare Bowenpally, Gaddiannaram, Warangal & more</span>
              </div>
              <ArrowRightIcon size={16} color="#94a3b8" />
            </div>

            <div
              className="quick-action-item action-buyers"
              onClick={() => navigate('/buyers')}
            >
              <div className="action-icon-wrap">
                <UsersIcon size={20} color="#7c3aed" />
              </div>
              <div className="action-info">
                <strong>Find Buyers</strong>
                <span>Connect with Reliance Fresh, BigBasket & local traders</span>
              </div>
              <ArrowRightIcon size={16} color="#94a3b8" />
            </div>

            <div
              className="quick-action-item action-predict"
              onClick={() => navigate('/price-prediction')}
            >
              <div className="action-icon-wrap">
                <TrendingUpIcon size={20} color="#d97706" />
              </div>
              <div className="action-info">
                <strong>Check Price Prediction</strong>
                <span>7-Day ML forecast to decide whether to sell or hold</span>
              </div>
              <ArrowRightIcon size={16} color="#94a3b8" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 3: Price Trend Chart using Recharts */}
      <section className="section-block">
        <PriceChart
          data={priceTrendData}
          cropName={activeCropLot.cropName}
        />
      </section>

      {/* 6. Section 2: Market Price Comparison */}
      <section className="section-block">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">2. Market Price Comparison</h3>
            <p className="section-sub">
              Calculated for your <strong>1,000 kg Tomato</strong> lot including OSRM transport cost
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/markets')}
          >
            <span>View All Mandis & Route Map</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>

        <div className="market-cards-grid">
          {marketsData.slice(0, 4).map((mkt) => (
            <MarketCard
              key={mkt.id}
              market={mkt}
              quantityKg={activeCropLot.quantityKg}
            />
          ))}
        </div>
      </section>

      {/* Nearby Markets & Storage Facilities Overview Section */}
      <section className="section-block">
        <div className="section-header-row">
          <div>
            <div className="section-tag-inline">
              <h3 className="section-title">Nearby Markets & Storage Facilities</h3>
              <span className="badge badge-blue">Interactive Map Feature</span>
            </div>
            <p className="section-sub">
              Compare regional cold chain preservation chambers with direct mandi logistics
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/storage')}
          >
            <WarehouseIcon size={14} />
            <span>Open Interactive Map & Route Planner</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>

        <div className="nearby-storage-dashboard-grid">
          {storageFacilities.slice(0, 3).map((stg) => {
            const isCold = stg.type === 'Cold Storage';
            return (
              <div
                key={stg.id}
                className="mini-storage-card card"
                onClick={() => navigate('/storage')}
                style={{ cursor: 'pointer' }}
              >
                <div className="mini-storage-top">
                  <div className={`mini-storage-icon ${isCold ? 'icon-cold' : 'icon-warehouse'}`}>
                    {isCold ? <SnowflakeIcon size={16} /> : <WarehouseIcon size={16} />}
                  </div>
                  <div className="mini-storage-titles">
                    <h4 className="mini-name">{stg.name}</h4>
                    <span className="mini-dist">
                      <MapPinIcon size={11} color="#64748b" />
                      {stg.distance} km • {stg.address.split(',')[0]}
                    </span>
                  </div>
                  <span className={`badge ${isCold ? 'badge-blue' : 'badge-gold'}`}>
                    {stg.type}
                  </span>
                </div>

                <div className="mini-storage-stats">
                  <div>
                    <span className="mini-lbl">Rate</span>
                    <strong>₹{stg.pricePerKgPerDay}/kg/day</strong>
                  </div>
                  <div>
                    <span className="mini-lbl">Available Space</span>
                    <strong>{stg.availableCapacity} Tons</strong>
                  </div>
                  <div>
                    <span className="mini-lbl">Climate</span>
                    <span>{stg.temperatureControlled ? '2-8°C' : 'Ventilated'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Section 5: Nearby Verified Buyers */}
      <section className="section-block">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">5. Nearby Verified Buyers</h3>
            <p className="section-sub">
              Direct institutional procurement with 100% digital escrow guarantee
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/buyers')}
          >
            <span>Explore Buyer Directory</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>

        <div className="buyer-cards-grid">
          {verifiedBuyersData.slice(0, 2).map((buyer) => (
            <BuyerCard key={buyer.id} buyer={buyer} />
          ))}
        </div>
      </section>
    </div>
  );
}
