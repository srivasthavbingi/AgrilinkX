import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConsumerNavbar from '../components/ConsumerNavbar';
import {
  SearchIcon,
  MapPinIcon,
  SparklesIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ClockIcon,
  TrendingUpIcon,
} from '../components/Icons';
import { productCategories, popularSearches } from '../data/productCatalog';
import { farmerListings } from '../data/farmerListings';
import { locationService } from '../services/locationService';
import { api } from '../services/api';

export default function Home() {
  const navigate = useNavigate();

  // Search form state
  const [productQuery, setProductQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [preference, setPreference] = useState('Nearest'); // 'Nearest', 'Freshest', 'Best Price', 'Direct from Farmer'
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const currentLocation = locationService.getCurrentLocation();

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const query = productQuery.trim() || 'Tomato';
    setIsLoading(true);

    try {
      const data = await api.searchProducts({
        product: query,
        quantity,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        preference,
      });

      navigate(
        `/recommendations?query=${encodeURIComponent(query)}&qty=${quantity}&unit=${unit}&pref=${encodeURIComponent(preference)}`,
        { state: { apiResults: data, isLocalFallback: false } }
      );
    } catch (err) {
      console.warn('FastAPI search unavailable, using local fallback:', err.message);
      navigate(
        `/recommendations?query=${encodeURIComponent(query)}&qty=${quantity}&unit=${unit}&pref=${encodeURIComponent(preference)}`,
        { state: { isLocalFallback: true } }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = (item) => {
    setProductQuery(item.query);
    setQuantity(item.qty);
    setUnit(item.unit);
    handleSearchSubmitDirect(item.query, item.qty, item.unit);
  };

  const handleSearchSubmitDirect = async (queryText, qtyVal, unitVal) => {
    if (isLoading) return;
    const query = queryText.trim() || 'Tomato';
    setIsLoading(true);

    try {
      const data = await api.searchProducts({
        product: query,
        quantity: qtyVal,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        preference,
      });

      navigate(
        `/recommendations?query=${encodeURIComponent(query)}&qty=${qtyVal}&unit=${unitVal}&pref=${encodeURIComponent(preference)}`,
        { state: { apiResults: data, isLocalFallback: false } }
      );
    } catch (err) {
      console.warn('FastAPI search unavailable, using local fallback:', err.message);
      navigate(
        `/recommendations?query=${encodeURIComponent(query)}&qty=${qtyVal}&unit=${unitVal}&pref=${encodeURIComponent(preference)}`,
        { state: { isLocalFallback: true } }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter nearby items for carousel / preview
  const nearbyFeatured = farmerListings.slice(0, 6);

  return (
    <div className="consumer-home-page">
      <ConsumerNavbar onSearchSubmit={(q) => {
        setProductQuery(q);
        handleSearchSubmitDirect(q, quantity, unit);
      }} />

      {/* Hero Section */}
      <section className="consumer-hero-section">
        <div className="hero-content-wrapper">
          <div className="hero-pill-badge">
            <span className="pill-pulse"></span>
            <span>HYPER-LOCAL DIRECT FARM-TO-FAMILY ENGINE</span>
          </div>

          <h1 className="hero-main-title">
            Fresh products directly from nearby farmers.
          </h1>

          <p className="hero-subtitle-motto">
            "Nearby first. Wider only when necessary." — Your preferences matter, not just distance.
          </p>

          {/* Main Interactive Search Box */}
          <form onSubmit={handleSearchSubmit} className="hero-search-card card">
            {isLoading && (
              <div className="search-loading-banner" style={{ padding: '8px 12px', marginBottom: '12px', background: '#ecfdf5', borderRadius: '8px', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SparklesIcon size={16} color="#059669" />
                <span>Finding the best farmers near you...</span>
              </div>
            )}

            <div className="search-form-row">
              {/* Product input */}
              <div className="search-input-field flex-2">
                <label className="input-caption">What do you need today?</label>
                <div className="input-with-icon">
                  <SearchIcon size={18} color="#059669" />
                  <input
                    type="text"
                    placeholder="Search tomatoes, rice, tea, fruits..."
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Quantity selector */}
              <div className="search-input-field qty-field">
                <label className="input-caption">Quantity</label>
                <div className="qty-picker-wrap">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="qty-number-input"
                    disabled={isLoading}
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="unit-select"
                    disabled={isLoading}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="bundle">bundle</option>
                    <option value="dozen">dozen</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
              </div>

              {/* Location indicator */}
              <div className="search-input-field loc-field">
                <label className="input-caption">Location</label>
                <div className="loc-display-chip">
                  <MapPinIcon size={15} color="#0284c7" />
                  <span>{currentLocation.area}</span>
                </div>
              </div>

              {/* Primary action */}
              <button
                type="submit"
                className="btn btn-primary btn-search-primary"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Finding Farmers...' : 'Find Best Match'}</span>
                {!isLoading && <ArrowRightIcon size={16} />}
              </button>
            </div>

            {/* Preference Options */}
            <div className="search-preferences-bar">
              <span className="pref-label">Optimize Search By:</span>
              <div className="pref-pills-list">
                {['Nearest', 'Freshest', 'Best Price', 'Direct from Farmer'].map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    className={`pref-pill ${preference === pref ? 'active' : ''}`}
                    onClick={() => setPreference(pref)}
                    disabled={isLoading}
                  >
                    {pref === 'Nearest' && '📍 '}
                    {pref === 'Freshest' && '🌿 '}
                    {pref === 'Best Price' && '💰 '}
                    {pref === 'Direct from Farmer' && '👨‍🌾 '}
                    {pref}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Quick Popular Searches */}
          <div className="popular-tags-strip">
            <span className="tags-label">Popular Searches:</span>
            <div className="tags-list">
              {popularSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="quick-tag-pill"
                  onClick={() => handleQuickSearch(item)}
                  disabled={isLoading}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="consumer-categories-section">
        <div className="content-container">
          <div className="section-head-row">
            <div>
              <h2 className="section-heading">Browse Farm Categories</h2>
              <p className="section-subtext">Everyday daily groceries straight from peri-urban agricultural clusters</p>
            </div>
          </div>

          <div className="categories-pills-grid">
            {productCategories.map((cat) => (
              <div
                key={cat.id}
                className={`category-pill-card ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.id !== 'all') {
                    handleSearchSubmitDirect(cat.id, 1, 'kg');
                  }
                }}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Near You */}
      <section className="consumer-recommended-section">
        <div className="content-container">
          <div className="section-head-row">
            <div>
              <div className="section-badge-tag">
                <SparklesIcon size={14} color="#059669" />
                <span>DYNAMIC RADIUS DISCOVERY</span>
              </div>
              <h2 className="section-heading">Recommended Near You</h2>
              <p className="section-subtext">
                Available harvests within 0–5 km radius of your location
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSearchSubmitDirect('Tomato', 1, 'kg')}
            >
              <span>Explore All Local Listings</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>

          <div className="featured-listings-grid">
            {nearbyFeatured.map((item) => (
              <div key={item.id} className="consumer-product-card card">
                <div className="prod-card-header">
                  <span className="badge badge-emerald">{item.category}</span>
                  <span className="prod-dist-chip">
                    <MapPinIcon size={12} color="#059669" />
                    {item.distance} km away
                  </span>
                </div>

                <div className="prod-main-details">
                  <h3 className="prod-name">{item.product}</h3>
                  <span className="prod-variety">{item.variety}</span>
                  <div className="prod-origin-tag">
                    <span>Origin: <strong>{item.origin}</strong></span>
                  </div>
                </div>

                <div className="prod-meta-strip">
                  <div className="meta-price-box">
                    <span className="price-num">₹{item.price}</span>
                    <span className="price-unit">/ {item.unit}</span>
                  </div>
                  <div className="meta-avail-box">
                    <span className="avail-lbl">Available Today</span>
                    <strong className="avail-qty">{item.quantityAvailable} {item.unit}</strong>
                  </div>
                </div>

                <div className="farmer-byline">
                  <div className="farmer-name-row">
                    <strong>{item.farmerName}</strong>
                    {item.verified && (
                      <span className="verified-check" title="Verified Producer">✓</span>
                    )}
                  </div>
                  <span className="farmer-rating">★ {item.rating}</span>
                </div>

                <div className="prod-card-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm flex-1"
                    onClick={() => navigate(`/farmer/${item.farmerId}`)}
                  >
                    View Farmer
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm flex-1"
                    onClick={() => navigate(`/order/${item.id}`, { state: { listing: item } })}
                  >
                    Buy Direct
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Consumer Trust & Pillars Strip */}
      <section className="consumer-pillars-strip">
        <div className="content-container pillars-inner">
          <div className="pillar-block">
            <div className="pillar-icon">📍</div>
            <h4>0–2 km First Priority</h4>
            <p>We dynamically start hyper-local, expanding search radius only when needed.</p>
          </div>
          <div className="pillar-block">
            <div className="pillar-icon">🌿</div>
            <h4>Harvested Today Freshness</h4>
            <p>Direct farmgate cuts with hours, not days, of logistics delay.</p>
          </div>
          <div className="pillar-block">
            <div className="pillar-icon">🎯</div>
            <h4>Origin-Aware Matching</h4>
            <p>Looking for Assam tea or Tandur dal? Authentic origin takes precedence.</p>
          </div>
          <div className="pillar-block">
            <div className="pillar-icon">⚖️</div>
            <h4>Family-Size Quantities</h4>
            <p>Buy 1 kg tomatoes or 500 g dal without wholesale quantity barriers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
