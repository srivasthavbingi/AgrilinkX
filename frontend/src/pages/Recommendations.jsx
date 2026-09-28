import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConsumerNavbar from '../components/ConsumerNavbar';
import ConsumerMap from '../components/ConsumerMap';
import FarmerRecommendationCard from '../components/FarmerRecommendationCard';
import {
  SparklesIcon,
  MapPinIcon,
  SearchIcon,
} from '../components/Icons';
import { recommendationEngine } from '../services/recommendationEngine';
import { locationService } from '../services/locationService';
import { api } from '../services/api';

export default function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();

  // Read URL query params
  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get('query') || 'Tomato';
  const qtyParam = parseFloat(searchParams.get('qty')) || 1;
  const unitParam = searchParams.get('unit') || 'kg';
  const prefParam = searchParams.get('pref') || 'Nearest';

  // Interactive controls state
  const [query, setQuery] = useState(queryParam);
  const [quantity, setQuantity] = useState(qtyParam);
  const [unit, setUnit] = useState(unitParam);
  const [preference, setPreference] = useState(prefParam);
  const [selectedFarmerForMap, setSelectedFarmerForMap] = useState(null);

  // Backend connection & fallback state
  const [apiData, setApiData] = useState(location.state?.apiResults || null);
  const [isLocalFallback, setIsLocalFallback] = useState(Boolean(location.state?.isLocalFallback));
  const [loading, setLoading] = useState(false);

  const userLocation = locationService.getCurrentLocation();

  // Sync state & fetch backend search if query or URL parameters change
  useEffect(() => {
    setQuery(queryParam);
    setQuantity(qtyParam);
    setUnit(unitParam);
    setPreference(prefParam);

    // If state was passed directly from Home navigation, use it if query matches
    if (location.state?.apiResults && location.state.apiResults.query?.toLowerCase() === queryParam.toLowerCase()) {
      setApiData(location.state.apiResults);
      setIsLocalFallback(false);
      setLoading(false);
      return;
    }

    // Otherwise fetch directly from FastAPI search endpoint
    let isMounted = true;
    setLoading(true);

    api
      .searchProducts({
        product: queryParam,
        quantity: qtyParam,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        preference: prefParam,
      })
      .then((data) => {
        if (isMounted) {
          setApiData(data);
          setIsLocalFallback(false);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('FastAPI search fetch error, reverting to local fallback:', err.message);
        if (isMounted) {
          setApiData(null);
          setIsLocalFallback(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [queryParam, qtyParam, unitParam, prefParam, location.state]);

  // Format recommendations either from FastAPI or Local Fallback Engine
  const recommendationResults = useMemo(() => {
    // Safe extraction helpers for price, distance, and freshness
    const getValidPrice = (item) => {
      if (!item) return Infinity;
      const p = item.price ?? item.price_per_unit;
      const num = Number(p);
      return !isNaN(num) && num >= 0 ? num : Infinity;
    };

    const getValidDistance = (item) => {
      if (!item) return Infinity;
      const d = item.distance;
      const num = Number(d);
      return !isNaN(num) && num >= 0 ? num : Infinity;
    };

    if (!isLocalFallback && apiData && apiData.results) {
      const results = apiData.results;

      // Attach data-backed recommendation reasons to each API result
      const parsedQueryInfo = {
        preferredOrigin: apiData.parsedOrigin || apiData.parsed_origin,
        hasExplicitOrigin: Boolean(apiData.parsedOrigin || apiData.parsed_origin),
      };
      results.forEach((r) => {
        r.reasons = recommendationEngine.getRecommendationReasons(r, quantity, unit, results, parsedQueryInfo);
      });

      const bestMatch = results[0] || null;

      const availableItems = results.filter((item) => !item.isPartialMatch && !item.isBelowMinOrder);
      const pool = availableItems.length > 0 ? availableItems : results;

      // Smallest valid distance in pool
      const validDistanceItems = [...pool].filter((item) => getValidDistance(item) < Infinity);
      validDistanceItems.sort((a, b) => getValidDistance(a) - getValidDistance(b));
      const minDistance = validDistanceItems[0] ? getValidDistance(validDistanceItems[0]) : Infinity;

      const nearbyAlternative =
        validDistanceItems.find((item) => (!bestMatch || item.id !== bestMatch.id) && getValidDistance(item) === minDistance) ||
        validDistanceItems.find((item) => !bestMatch || item.id !== bestMatch.id) ||
        null;

      // Absolute lowest valid price among displayed matching listings
      const validPriceItems = [...pool].filter((item) => getValidPrice(item) < Infinity);
      validPriceItems.sort((a, b) => getValidPrice(a) - getValidPrice(b));
      const minPrice = validPriceItems[0] ? getValidPrice(validPriceItems[0]) : Infinity;

      // Best Price MUST correspond strictly to the lowest valid price (minPrice)
      let bestPrice = null;
      if (minPrice < Infinity) {
        const distinctMinPriceItem = validPriceItems.find(
          (item) =>
            getValidPrice(item) === minPrice &&
            (!bestMatch || item.id !== bestMatch.id) &&
            (!nearbyAlternative || item.id !== nearbyAlternative.id)
        );
        if (distinctMinPriceItem) {
          bestPrice = distinctMinPriceItem;
        }
      }

      const radius = apiData.searchRadius || apiData.search_radius || 2;
      const searchProgression = [];
      if (radius > 2) {
        searchProgression.push({
          radius: 2,
          success: false,
          status: `No nearby farmer found within 2 km. Expanded search radius to ${radius} km.`,
        });
      }
      searchProgression.push({
        radius,
        success: true,
        status: `Showing ${results.length} suitable ${results.length === 1 ? 'farmer' : 'farmers'} found within ${radius} km via FastAPI Backend.`,
      });

      return {
        tiered: { bestMatch, nearbyAlternative, bestPrice },
        allResults: results,
        finalRadius: radius,
        searchProgression,
        totalMatches: results.length,
        parsedQuery: {
          product: apiData.parsedProduct || apiData.parsed_product || query,
          preferredOrigin: apiData.parsedOrigin || apiData.parsed_origin || null,
          hasExplicitOrigin: Boolean(apiData.parsedOrigin || apiData.parsed_origin),
        },
      };
    }

    // Local mock recommendation fallback
    return recommendationEngine.findRecommendations({
      product: query,
      quantity,
      unit,
      preference,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    });
  }, [apiData, isLocalFallback, query, quantity, unit, preference, userLocation]);

  const {
    tiered,
    allResults,
    finalRadius,
    searchProgression,
    totalMatches,
    parsedQuery,
  } = recommendationResults;

  const bestMatch = tiered.bestMatch;
  const nearbyAlternative = tiered.nearbyAlternative;
  const bestPrice = tiered.bestPrice;

  // Filter out top tiered matches from other matches
  const otherResults = allResults.filter(
    (item) =>
      (!bestMatch || item.id !== bestMatch.id) &&
      (!nearbyAlternative || item.id !== nearbyAlternative.id) &&
      (!bestPrice || item.id !== bestPrice.id)
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (loading) return;

    navigate(
      `/recommendations?query=${encodeURIComponent(query)}&qty=${quantity}&unit=${encodeURIComponent(unit)}&pref=${encodeURIComponent(preference)}`
    );
  };

  const handleSelectFarmer = (farmer) => {
    setSelectedFarmerForMap(farmer);
    if (farmer && farmer.id) {
      const cardEl = document.getElementById(`listing-card-${farmer.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="recommendations-page">
      <ConsumerNavbar
        initialSearch={query}
        onSearchSubmit={(newQ) => {
          setQuery(newQ);
          navigate(
            `/recommendations?query=${encodeURIComponent(newQ)}&qty=${quantity}&unit=${unit}&pref=${preference}`
          );
        }}
      />

      <div className="content-container page-inner">
        {/* Your Search Summary Bar */}
        <div className="your-search-header-card card">
          <div className="search-header-main">
            <div className="search-summary-title">
              <span className="summary-label">YOUR SEARCH</span>
              <h2 className="summary-query-text">
                {query} <span className="query-qty-pill">{quantity} {unit}</span>
              </h2>
            </div>

            <div className="search-location-chip" style={{ gap: '10px' }}>
              <MapPinIcon size={14} color="#0284c7" />
              <span>
                Location: <strong>{userLocation.area || 'Current Address'}</strong>
              </span>

              {!userLocation || !userLocation.latitude ? (
                <span className="badge badge-amber" title="Location unavailable">
                  Location unavailable — distance ranking is limited
                </span>
              ) : isLocalFallback ? (
                <span className="badge badge-amber" title="FastAPI server offline; fallback active">
                  Using local availability data
                </span>
              ) : (
                <span className="badge badge-emerald" title="FastAPI backend connected">
                  ⚡ FastAPI Connected
                </span>
              )}
            </div>
          </div>

          {/* Quick inline search editor */}
          <form onSubmit={handleSearchSubmit} className="search-refine-strip">
            <div className="refine-field flex-2">
              <div className="input-with-icon">
                <SearchIcon size={16} color="#059669" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Change item (e.g. Assam tea, Tomato...)"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="refine-field qty-field">
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="qty-number-input"
                disabled={loading}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="unit-select"
                disabled={loading}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="bundle">bundle</option>
                <option value="dozen">dozen</option>
                <option value="piece">piece</option>
              </select>
            </div>

            <div className="refine-field">
              <select
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
                className="pref-select"
                disabled={loading}
              >
                <option value="Nearest">Nearest First</option>
                <option value="Freshest">Freshest Pick</option>
                <option value="Best Price">Best Price</option>
                <option value="Direct from Farmer">Direct Producer</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Finding Farmers...' : 'Update Search'}
            </button>
          </form>
        </div>

        {/* Dynamic Radius Progression Banner */}
        <div className="radius-progression-banner card">
          <div className="radius-banner-top">
            <div className="radius-banner-title">
              <span className="live-radar-dot"></span>
              <strong>AI Dynamic Search Radius Intelligence</strong>
            </div>
            <span className="badge badge-emerald">
              {totalMatches} {totalMatches === 1 ? 'farmer' : 'farmers'} found within {finalRadius} km
            </span>
          </div>

          {/* Step-by-step radius trace */}
          <div className="progression-steps-track">
            {searchProgression.map((step, idx) => (
              <div
                key={idx}
                className={`step-item ${step.success ? 'step-success' : 'step-expanded'}`}
              >
                <span className="step-icon">{step.success ? '✓' : '➔'}</span>
                <span className="step-text">{step.status}</span>
              </div>
            ))}
          </div>

          <div className="radius-criteria-summary">
            {parsedQuery.hasExplicitOrigin && (
              <span className="badge badge-gold">
                Assam Origin Match Priority: {parsedQuery.preferredOrigin} ✓
              </span>
            )}
            {finalRadius > 2 && (
              <span className="text-amber">
                No nearby farmer found within 2 km. We expanded the search to {finalRadius} km.
              </span>
            )}
            {isLocalFallback && (
              <span className="text-amber" style={{ marginLeft: '12px' }}>
                Using local availability data.
              </span>
            )}
          </div>
        </div>

        {/* Responsive Dual Layout: Left Cards, Right Interactive Map */}
        <div className="recommendations-split-layout">
          {/* Left Column: Ranked Farmer Cards */}
          <div className="recommendations-list-column">
            {loading && (
              <div className="card text-center" style={{ padding: '32px', color: '#059669' }}>
                <SparklesIcon size={28} color="#059669" />
                <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '1.1rem' }}>
                  Finding the best farmers near you...
                </p>
                <span className="sub-text">Scanning regional producer inventory & calculating optimal match scores</span>
              </div>
            )}

            {!loading && (
              <>
                {/* 🥇 BEST MATCH */}
                {bestMatch && (
                  <FarmerRecommendationCard
                    listing={bestMatch}
                    requestedQuantity={quantity}
                    requestedUnit={unit}
                    rank="best"
                    isSelected={selectedFarmerForMap?.id === bestMatch.id}
                    onViewOnMap={(f) => handleSelectFarmer(f)}
                  />
                )}

                {/* 🥈 NEARBY ALTERNATIVE */}
                {nearbyAlternative && (
                  <FarmerRecommendationCard
                    listing={nearbyAlternative}
                    requestedQuantity={quantity}
                    requestedUnit={unit}
                    rank="nearby"
                    isSelected={selectedFarmerForMap?.id === nearbyAlternative.id}
                    onViewOnMap={(f) => handleSelectFarmer(f)}
                  />
                )}

                {/* 🥉 BEST PRICE */}
                {bestPrice && (
                  <FarmerRecommendationCard
                    listing={bestPrice}
                    requestedQuantity={quantity}
                    requestedUnit={unit}
                    rank="price"
                    isSelected={selectedFarmerForMap?.id === bestPrice.id}
                    onViewOnMap={(f) => handleSelectFarmer(f)}
                  />
                )}

                {/* Other Matching Producers */}
                {otherResults.length > 0 && (
                  <div className="other-results-section">
                    <h4 className="other-title">Other Matching Producers ({otherResults.length})</h4>
                    <div className="other-results-list">
                      {otherResults.map((item) => (
                        <FarmerRecommendationCard
                          key={item.id}
                          listing={item}
                          requestedQuantity={quantity}
                          requestedUnit={unit}
                          rank="other"
                          isSelected={selectedFarmerForMap?.id === item.id}
                          onViewOnMap={(f) => handleSelectFarmer(f)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {totalMatches === 0 && (
                  <div className="card empty-results-card text-center" style={{ padding: '40px' }}>
                    <div className="empty-icon" style={{ fontSize: '3rem' }}>🌾</div>
                    <h3 style={{ marginTop: '12px' }}>No matching farmers found.</h3>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>
                      Try adjusting requested quantity or searching for popular local harvests like Tomato, Rice, Tea, or Spinach.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Interactive Consumer Map */}
          <div className="recommendations-map-column">
            <div className="map-sticky-box">
              <div className="map-column-header flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPinIcon size={16} color="#059669" />
                  <span>Geospatial Radar — Recommended Farmers</span>
                </div>
                {selectedFarmerForMap && (
                  <span className="badge badge-blue">
                    Selected: {selectedFarmerForMap.farmerName}
                  </span>
                )}
              </div>
              <ConsumerMap
                userLocation={userLocation}
                farmers={allResults}
                bestMatchId={bestMatch?.id}
                selectedFarmer={selectedFarmerForMap}
                searchRadius={finalRadius}
                height="540px"
                onSelectFarmer={(f) => handleSelectFarmer(f)}
              />
              <div className="map-caption-note">
                Highlighted marker (⭐ #1) indicates the algorithmically calculated top match considering distance, availability, freshness, quality & origin. Click markers or cards to highlight.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
