import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import farmerIntelligenceService from '../services/farmerIntelligenceService';
import PriceIntelligenceCard from '../components/PriceIntelligenceCard';
import PriceComparisonTable from '../components/PriceComparisonTable';
import GovernmentMandiCard from '../components/GovernmentMandiCard';
import OpportunityCard from '../components/OpportunityCard';
import MLPriceForecastCard from '../components/MLPriceForecastCard';
import MarketComparisonSection from '../components/MarketComparisonSection';
import FarmerPriceSummary from '../components/FarmerPriceSummary';
import DemandCard from '../components/DemandCard';
import ExpectedPriceCard from '../components/ExpectedPriceCard';
import SimplePriceTrend from '../components/SimplePriceTrend';
import MarketGuidanceCard from '../components/MarketGuidanceCard';

import DemandBadge from '../components/DemandBadge';
import StatCard from '../components/StatCard';
import {
  TrendingUpIcon,
  DollarSignIcon,
  PackageIcon,
  ShoppingCartIcon,
  IndianRupeeIcon,
  UsersIcon,
  SparklesIcon,
} from '../components/Icons';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionCard({ title, subtitle, badge, children, className = '' }) {
  return (
    <div className={`mi-section-card card ${className}`}>
      <div className="mi-section-header">
        <div>
          <h2 className="mi-section-title">{title}</h2>
          {subtitle && <p className="mi-section-sub">{subtitle}</p>}
        </div>
        {badge && <span className="badge badge-emerald">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="mi-loading">
      <div className="mi-spinner" />
      <span>{message}</span>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mi-error-banner">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button className="btn btn-sm btn-outline" onClick={onRetry} type="button">
          Retry
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarketIntelligence Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketIntelligence() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [miData, setMiData] = useState(null);
  const [piData, setPiData] = useState(null);
  const [diData, setDiData] = useState(null);
  const [govMandiData, setGovMandiData] = useState(null);

  const [miLoading, setMiLoading] = useState(true);
  const [piLoading, setPiLoading] = useState(true);
  const [diLoading, setDiLoading] = useState(true);
  const [govMandiLoading, setGovMandiLoading] = useState(true);

  const [miError, setMiError] = useState(null);
  const [piError, setPiError] = useState(null);
  const [diError, setDiError] = useState(null);
  const [govMandiError, setGovMandiError] = useState(null);

const COMMODITY_EMOJIS = {
  Tomato: '🍅', Potato: '🥔', Onion: '🧅', Chilli: '🌶️',
  Maize: '🌽', Rice: '🌾', Wheat: '🌾', Spinach: '🥬',
  'Toor Dal': '🫘', Milk: '🥛', Tea: '🍵',
};

// Selected product for charts (first product by default)
const [selectedProduct, setSelectedProduct] = useState(null);
const [step2Commodity, setStep2Commodity] = useState('Tomato');
const [showDetailedSections, setShowDetailedSections] = useState(false);

  const fetchGovMandiOnly = useCallback(async () => {
    // Clear stale display state immediately
    setGovMandiData(null);
    setGovMandiError(null);
    setGovMandiLoading(true);

    try {
      const govRes = await farmerIntelligenceService.getMandiPrices();
      if (govRes && govRes.source_status === 'available') {
        setGovMandiData(govRes);
      } else {
        setGovMandiData(govRes);
        setGovMandiError(govRes?.message || 'Government mandi data temporarily unavailable.');
      }
    } catch (err) {
      setGovMandiError(err?.message || 'Government mandi data temporarily unavailable.');
    } finally {
      setGovMandiLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setMiLoading(true); setPiLoading(true); setDiLoading(true); setGovMandiLoading(true);
    setMiError(null); setPiError(null); setDiError(null); setGovMandiError(null);

    // All 4 in parallel — one failure doesn't block others
    const [miRes, piRes, diRes, govRes] = await Promise.allSettled([
      farmerIntelligenceService.getMarketIntelligence(),
      farmerIntelligenceService.getPriceIntelligence(),
      farmerIntelligenceService.getDemandIntelligence(),
      farmerIntelligenceService.getMandiPrices(),
    ]);

    if (miRes.status === 'fulfilled') { setMiData(miRes.value); }
    else { setMiError(miRes.reason?.message || 'Could not load market intelligence.'); }
    setMiLoading(false);

    if (piRes.status === 'fulfilled') {
      setPiData(piRes.value);
      if (piRes.value?.products?.length) setSelectedProduct(piRes.value.products[0].product);
    } else { setPiError(piRes.reason?.message || 'Could not load price intelligence.'); }
    setPiLoading(false);

    if (diRes.status === 'fulfilled') { setDiData(diRes.value); }
    else { setDiError(diRes.reason?.message || 'Could not load demand intelligence.'); }
    setDiLoading(false);

    if (govRes.status === 'fulfilled') { setGovMandiData(govRes.value); }
    else { setGovMandiError('Government mandi data temporarily unavailable.'); }
    setGovMandiLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // 15-minute conservative auto-refresh (Requirement #12)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGovMandiOnly();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchGovMandiOnly]);

  // Derived data
  const summary = miData?.summary;
  const rawPiProducts = piData?.products || [];
  const diProducts = diData?.products || [];

  // Match government mandi record to product name
  const findGovMandiRecord = (productName) => {
    if (!productName || !govMandiData?.data?.length) return null;
    const cleanProd = productName.trim().toLowerCase();
    return govMandiData.data.find(r => {
      if (!r.commodity) return false;
      const c = r.commodity.trim().toLowerCase();
      return cleanProd.includes(c) || c.includes(cleanProd);
    }) || null;
  };

  // Attach government mandi prices to piProducts for cards and tables
  const piProducts = rawPiProducts.map(p => {
    const rec = findGovMandiRecord(p.product);
    return {
      ...p,
      gov_mandi_price: rec?.normalized_price_per_kg !== undefined ? rec.normalized_price_per_kg : null,
      gov_mandi_record: rec,
    };
  });

  // Currently selected demand-intelligence product for charts
  const selectedDiItem = diProducts.find(p => p.product === selectedProduct) || diProducts[0];
  const selectedPiItem = piProducts.find(p => p.product === selectedProduct) || piProducts[0];

  // Opportunity cards: products where farmer price < 97% of platform avg OR high demand
  const opportunityItems = piProducts.filter(p =>
    (p.platform_avg && p.your_price < p.platform_avg * 0.97) ||
    p.demand_level === 'HIGH'
  );

  const farmerName = miData?.farmer_name || profile?.full_name || 'Farmer';


  return (
    <div className="mi-page">

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <section className="mi-hero">
        <div className="mi-hero-left">
          <div className="mi-hero-greeting">
            <span className="mi-greeting-text">
              {getGreeting()}, {farmerName.split(' ')[0]} 👋
            </span>
            <span className="badge badge-emerald">
              <SparklesIcon size={12} color="#059669" /> Market Intelligence
            </span>
          </div>
          <h1 className="mi-hero-title">Farmer Market Intelligence</h1>
          <p className="mi-hero-sub">
            Real data from AgriLinkX platform — price discovery, demand signals, and market opportunities for your products.
          </p>
        </div>
        <div className="mi-hero-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/inventory')} type="button">
            📦 Manage Inventory
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/farmer/orders')} type="button">
            🛒 View Orders
          </button>
        </div>
      </section>

      {/* ── Summary Stats ────────────────────────────────────────── */}
      {miLoading ? (
        <LoadingSpinner message="Loading your market summary..." />
      ) : miError ? (
        <ErrorBanner message={miError} onRetry={fetchAll} />
      ) : summary ? (
        <section className="mi-stats-grid">
          <StatCard
            title="Total Inventory"
            value={summary.total_inventory_qty.toLocaleString()}
            unit="kg"
            subtitle={`${summary.active_products} active product${summary.active_products !== 1 ? 's' : ''}`}
            icon={PackageIcon}
            color="emerald"
          />
          <StatCard
            title="Pending Orders"
            value={summary.pending_orders}
            unit="orders"
            subtitle="Awaiting processing"
            icon={ShoppingCartIcon}
            color="gold"
          />
          <StatCard
            title="Completed Orders"
            value={summary.completed_orders}
            unit="delivered"
            subtitle="Successfully fulfilled"
            icon={TrendingUpIcon}
            color="blue"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${summary.total_revenue.toLocaleString()}`}
            subtitle="From delivered orders"
            icon={IndianRupeeIcon}
            color="purple"
            highlight={summary.total_revenue > 0}
          />
        </section>
      ) : (
        <div className="mi-empty-hero">
          <p>No data available yet. Add inventory listings to begin.</p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/inventory')} type="button">
            Add My First Listing
          </button>
        </div>
      )}

      {/* ── Step 2: Simple Price & Demand Intelligence (Farmer-First) ───── */}
      <section id="price-demand-intelligence">
      {(() => {
        const step2GovRecord = findGovMandiRecord(step2Commodity);
        const step2DiItem = diProducts.find(p => p.product.toLowerCase() === step2Commodity.toLowerCase());
        const step2MarketPrice = step2GovRecord?.normalized_price_per_kg || null;
        const step2DemandLevel = step2DiItem?.demand_level || 'NONE';
        const step2OrderedQty = step2DiItem?.your_ordered_qty || 0;
        const step2OrderCount = step2DiItem?.your_order_count || 0;
        const step2Unit = step2DiItem?.unit || 'kg';
        const step2PriceTrend = step2DiItem?.price_trend || [];
        const step2ExpectedTomorrow = step2Commodity.toLowerCase() === 'maize' ? 24 : null;

        return (
          <SectionCard
            title="Simple Price & Demand Intelligence"
            subtitle="Understand market conditions quickly in plain everyday language."
            badge="Farmer-First"
          >
            {/* Commodity Selector */}
            <div className="flex flex-wrap gap-2 mb-4 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
              {['Tomato', 'Potato', 'Onion', 'Chilli', 'Maize', 'Rice', 'Wheat', 'Spinach', 'Toor Dal', 'Milk', 'Tea'].map((crop) => (
                <button
                  key={crop}
                  type="button"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    step2Commodity === crop
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                  onClick={() => setStep2Commodity(crop)}
                >
                  {(COMMODITY_EMOJIS[crop] || '🌿') + ' ' + crop}
                </button>
              ))}
            </div>

            {/* Farmer Price Summary (5-Second Instant Breakdown) */}
            <FarmerPriceSummary
              commodity={step2Commodity}
              commodityEmoji={COMMODITY_EMOJIS[step2Commodity] || '🌿'}
              marketPrice={step2MarketPrice}
              priceUnit={step2Unit}
              priceUpdated={step2GovRecord?.data_date || govMandiData?.data_date || 'Latest Available'}
              lastUpdated={
                govMandiData?.retrieved_at
                  ? new Date(govMandiData.retrieved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : null
              }
              demandLevel={step2DemandLevel}
              expectedTomorrow={step2ExpectedTomorrow}
              distanceKm={null}
              locationName={step2GovRecord?.market || step2GovRecord?.district || 'Telangana'}
              loading={govMandiLoading || diLoading}
              error={govMandiError}
            />

            {/* Step 3: Simple Market Opportunity Guidance */}
            {(() => {
              let step3TrendDirection = 'UNAVAILABLE';
              let step3PctChange = null;
              if (step2PriceTrend && step2PriceTrend.length >= 2) {
                const fP = step2PriceTrend[0].avg_price ?? step2PriceTrend[0].price ?? 0;
                const lP = step2PriceTrend[step2PriceTrend.length - 1].avg_price ?? step2PriceTrend[step2PriceTrend.length - 1].price ?? 0;
                if (fP > 0 && lP > 0) {
                  const diff = lP - fP;
                  step3PctChange = (diff / fP) * 100;
                  if (step3PctChange >= 2.0) step3TrendDirection = 'UP';
                  else if (step3PctChange <= -2.0) step3TrendDirection = 'DOWN';
                  else step3TrendDirection = 'STABLE';
                }
              }

              const otherGovMarkets = (govMandiData?.data || [])
                .filter((r) => r.normalized_price_per_kg !== null && r.normalized_price_per_kg > 0)
                .map((r) => ({ market: r.market, price: r.normalized_price_per_kg, distance: null }));

              return (
                <MarketGuidanceCard
                  commodity={step2Commodity}
                  commodityEmoji={COMMODITY_EMOJIS[step2Commodity] || '🌿'}
                  currentPrice={step2MarketPrice}
                  currentMarket={step2GovRecord?.market || 'Local Mandi'}
                  demandLevel={step2DemandLevel}
                  trendDirection={step3TrendDirection}
                  priceChangePct={step3PctChange}
                  forecastPrice={step2ExpectedTomorrow}
                  otherMarkets={otherGovMarkets}
                  onRefresh={fetchGovMandiOnly}
                  loading={govMandiLoading || diLoading}
                  error={govMandiError}
                />
              );
            })()}

            {/* 3-Card Simple Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              <DemandCard
                id="demand-insights"
                demandLevel={step2DemandLevel}
                orderedQty={step2OrderedQty}
                orderCount={step2OrderCount}
                unit={step2Unit}
                loading={diLoading}
                error={diError}
              />

              <ExpectedPriceCard
                commodity={step2Commodity}
                state="Telangana"
                market={step2GovRecord?.market || ''}
              />

              <SimplePriceTrend
                id="price-trend"
                trendData={step2PriceTrend}
                commodity={step2Commodity}
                loading={diLoading}
                error={diError}
              />
            </div>
          </SectionCard>
        );
      })()}
      </section>

      {/* ── Market Comparison Dashboard (SIH 2026 Step 1) ─────────── */}
      <section id="market-comparison">
        <MarketComparisonSection demandIntelligence={diData} />
      </section>

      {/* ── Market Opportunities (Farmer-Actionable) ──────────────── */}
      <SectionCard
        title="Market Opportunities"
        subtitle="Products where data suggests a pricing or demand opportunity"
      >
        {piLoading || diLoading ? (
          <LoadingSpinner message="Identifying opportunities..." />
        ) : opportunityItems.length === 0 ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">✅</span>
            <p>No price opportunities identified yet.</p>
            <p className="mi-empty-sub">
              {piData?.has_data
                ? 'Your prices are well-aligned with the platform. More data will refine this over time.'
                : 'Add listings and build order history to see market opportunities.'}
            </p>
          </div>
        ) : (
          <div className="opp-cards-grid">
            {opportunityItems.map(item => {
              const diItem = diProducts.find(p => p.product === item.product);
              return (
                <OpportunityCard key={item.product} item={item} demandItem={diItem} />
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Level 3: Detailed Platform Information (Collapsible) ────── */}
      <div className="mi-detailed-toggle my-6">
        <button
          type="button"
          className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          onClick={() => setShowDetailedSections(v => !v)}
        >
          <span>{showDetailedSections ? '▲' : '▼'}</span>
          <span>{showDetailedSections ? 'Hide Detailed Platform Information' : 'View Detailed Platform Information'}</span>
          <span className="text-xs text-slate-400 font-normal ml-2">(Price comparison, order history, ML forecast, government records)</span>
        </button>
      </div>

      {showDetailedSections && (
        <>

      {/* ── Price Intelligence ───────────────────────────────────── */}
      <SectionCard
        title="Price Intelligence"
        subtitle="Your price vs. AgriLinkX platform average — with suggested prices"
        badge="Platform Data"
      >
        {piLoading ? (
          <LoadingSpinner message="Calculating price intelligence..." />
        ) : piError ? (
          <ErrorBanner message={piError} onRetry={fetchAll} />
        ) : !piData?.has_data ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">📊</span>
            <p>{piData?.message || 'Add listings to see price intelligence.'}</p>
          </div>
        ) : (
          <div className="pi-cards-grid">
            {piProducts.map(item => (
              <PriceIntelligenceCard key={item.product} item={item} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Price Comparison Table ───────────────────────────────── */}
      {!piLoading && !piError && piData?.has_data && (
        <SectionCard
          title="Price Comparison Table"
          subtitle="Side-by-side view of all your products including government market benchmark"
        >
          <PriceComparisonTable items={piProducts} />
        </SectionCard>
      )}

      {/* ── Government Market Reference (data.gov.in / AGMARKNET) ──── */}
      <SectionCard
        title="Government Market Reference"
        subtitle="Official daily wholesale market prices from Government of India (data.gov.in / AGMARKNET)"
        badge="Government Data"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 text-xs">
          <div>
            <span className="font-semibold text-slate-200">Source: </span>
            <span className="text-slate-300">Government of India — data.gov.in / AGMARKNET</span>
            {govMandiData?.retrieved_at && (
              <span className="ml-3 text-slate-400 font-mono">
                Retrieved: {new Date(govMandiData.retrieved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {govMandiData?.data_date && (
              <span className="ml-3 text-emerald-400 font-mono">
                Data date: {govMandiData.data_date}
              </span>
            )}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md font-medium text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={fetchGovMandiOnly}
            disabled={govMandiLoading}
          >
            <span>🔄</span>
            <span>{govMandiLoading ? 'Refreshing Data...' : 'Refresh Market Data'}</span>
          </button>
        </div>

        {govMandiLoading ? (
          <LoadingSpinner message="Fetching government market prices..." />
        ) : govMandiError || govMandiData?.source_status === 'unavailable' ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">🏛️</span>
            <p className="font-semibold text-rose-400">Government mandi data temporarily unavailable.</p>
            <p className="mi-empty-sub">
              {govMandiData?.message || govMandiError || 'Check back later when government API is accessible.'}
            </p>
          </div>
        ) : !piProducts.length ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">📦</span>
            <p>Add listings to see government market price comparisons for your products.</p>
          </div>
        ) : govMandiData?.data?.length === 0 ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">📭</span>
            <p className="font-semibold text-slate-300">No government mandi records available for this selection.</p>
          </div>
        ) : (
          <div className="pi-cards-grid">
            {piProducts.map(item => {
              const rec = findGovMandiRecord(item.product);
              return (
                <GovernmentMandiCard
                  key={item.product}
                  productName={item.product}
                  yourPrice={item.your_price}
                  unit={item.unit}
                  mandiStatus={govMandiData?.source_status || 'available'}
                  mandiRecord={rec}
                  message={govMandiData?.message}
                />
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── AI Price Forecast (Baseline ML Model) ────────────────── */}
      {(() => {
        const maizeProd = piProducts.find(p => p.product.toLowerCase().includes('maize')) || piProducts[0];
        const govRec = findGovMandiRecord(maizeProd?.product || 'Maize');
        return (
          <MLPriceForecastCard
            selectedCommodity={maizeProd?.product || "Maize"}
            selectedState="Telangana"
            selectedMarket={govRec?.market || ""}
            currentMandiPrice={govRec?.normalized_price_per_kg || null}
            govMandiPrice={govRec?.normalized_price_per_kg || null}
            farmerListingPrice={maizeProd?.your_price || null}
          />
        );
      })()}

      {/* ── Demand Insights ──────────────────────────────────────── */}
      <SectionCard
        title="Demand Insights"
        subtitle="Demand signals derived from real platform order history"
        badge="Live Orders"
      >
        {diLoading ? (
          <LoadingSpinner message="Analysing demand patterns..." />
        ) : diError ? (
          <ErrorBanner message={diError} onRetry={fetchAll} />
        ) : !diData?.has_data ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">📦</span>
            <p>{diData?.message || 'Add listings to see demand intelligence.'}</p>
          </div>
        ) : (
          <>
            {/* Product selector tabs */}
            {diProducts.length > 1 && (
              <div className="mi-product-tabs">
                {diProducts.map(p => (
                  <button
                    key={p.product}
                    type="button"
                    className={`mi-product-tab ${selectedProduct === p.product ? 'active' : ''}`}
                    onClick={() => setSelectedProduct(p.product)}
                  >
                    {p.product}
                  </button>
                ))}
              </div>
            )}

            {/* Demand cards grid */}
            <div className="di-cards-grid">
              {diProducts.map(item => (
                <div key={item.product} className="di-card card">
                  <div className="di-card-header">
                    <h4 className="di-product">{item.product}</h4>
                    <DemandBadge level={item.demand_level} />
                  </div>

                  {item.demand_level === 'NONE' ? (
                    <p className="di-no-data">Not enough order history to calculate demand.</p>
                  ) : (
                    <div className="di-stats">
                      <div className="di-stat">
                        <span className="di-stat-val">{item.your_ordered_qty} {item.unit}</span>
                        <span className="di-stat-lbl">Total requested</span>
                      </div>
                      <div className="di-stat">
                        <span className="di-stat-val">{item.your_order_count}</span>
                        <span className="di-stat-lbl">Orders placed</span>
                      </div>
                      <div className="di-stat">
                        <span className="di-stat-val">{item.your_sold_qty} {item.unit}</span>
                        <span className="di-stat-lbl">Qty delivered</span>
                      </div>
                      <div className="di-stat">
                        <span className="di-stat-val">{item.your_available_qty} {item.unit}</span>
                        <span className="di-stat-lbl">Still available</span>
                      </div>
                    </div>
                  )}

                  {/* Platform-wide demand signal */}
                  {item.platform_ordered_qty > 0 && (
                    <div className="di-platform-signal">
                      <span className="di-platform-label">Platform-wide demand:</span>
                      <span className="di-platform-val">
                        {item.platform_ordered_qty} {item.unit} across {item.platform_order_count} orders
                      </span>
                    </div>
                  )}

                  {/* Nearby buyer activity */}
                  {item.nearby_family_count > 0 ? (
                    <div className="di-buyer-activity">
                      <UsersIcon size={14} color="#0284c7" />
                      <span>
                        {item.nearby_family_count} registered famil{item.nearby_family_count === 1 ? 'y' : 'ies'} on AgriLinkX in your area
                      </span>
                    </div>
                  ) : (
                    <div className="di-buyer-activity di-buyer-empty">
                      Buyer activity data will appear as more families use AgriLinkX.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Price Trend Chart ─────────────────────────────────────── */}
      <SectionCard
        title="Price Trend"
        subtitle="AgriLinkX listing prices over time — based on real platform data"
      >
        {diLoading ? (
          <LoadingSpinner message="Loading trend data..." />
        ) : !selectedDiItem ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">📈</span>
            <p>Price trend will appear as more marketplace data is collected.</p>
          </div>
        ) : !selectedDiItem.price_trend_sufficient ? (
          <div className="mi-empty-state">
            <span className="mi-empty-icon">📈</span>
            <p>Not enough historical data for a trend yet.</p>
            <p className="mi-empty-sub">
              Price trend appears when AgriLinkX has {selectedDiItem.product} listings across at least 2 different dates.
            </p>
          </div>
        ) : (
          <div className="mi-chart-wrapper">
            <div className="mi-chart-header">
              <span className="mi-chart-title">{selectedDiItem.product} — Listing Prices Over Time</span>
              <span className="mi-chart-note">AgriLinkX platform prices (avg per day)</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={selectedDiItem.price_trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={d => d.slice(5)} /* show MM-DD */
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={v => `₹${v}`}
                  width={52}
                />
                <Tooltip
                  formatter={(val) => [`₹${val}/kg`, 'Avg Price']}
                  labelFormatter={(l) => `Date: ${l}`}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_price"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                  name="Avg Price"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* ── Demand Trend Chart ────────────────────────────────────── */}
      {!diLoading && !diError && diData?.has_data && selectedDiItem && selectedDiItem.your_order_count > 0 && (
        <SectionCard
          title="Demand Trend"
          subtitle="Orders placed for your products — from real order history"
        >
          {diProducts.length > 0 ? (
            <div className="mi-chart-wrapper">
              <div className="mi-chart-header">
                <span className="mi-chart-title">Quantity Ordered per Product</span>
                <span className="mi-chart-note">Based on your order history</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={diProducts.filter(p => p.your_ordered_qty > 0).map(p => ({
                    name: p.product,
                    ordered: p.your_ordered_qty,
                    delivered: p.your_sold_qty,
                  }))}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(val, name) => [`${val} kg`, name === 'ordered' ? 'Total Requested' : 'Delivered']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Bar dataKey="ordered" fill="#3b82f6" radius={[4, 4, 0, 0]} name="ordered" />
                  <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="delivered" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mi-empty-state">
              <p>Not enough order history to calculate demand.</p>
            </div>
          )}
        </SectionCard>
      )}

      </>
      )}

    </div>
  );
}
