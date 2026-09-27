import React, { useState, useEffect, useCallback } from 'react';
import marketService from '../services/marketService';
import locationService from '../services/locationService';
import DemandBadge from './DemandBadge';

const COMMODITY_OPTIONS = [
  'Tomato',
  'Potato',
  'Onion',
  'Chilli',
  'Maize',
  'Rice',
  'Wheat',
  'Spinach',
  'Toor Dal',
  'Milk',
  'Tea',
];

const STATE_OPTIONS = [
  'Telangana',
  'Andhra Pradesh',
  'Maharashtra',
  'Karnataka',
  'Tamil Nadu',
];

/**
 * MarketComparisonSection Component
 * Implements SIH 2026 Step 1: Real Government Mandi Market Comparison Dashboard.
 * Strictly enforces data integrity: No fake prices, synthetic ML, or fabricated distances.
 */
export default function MarketComparisonSection({ demandIntelligence = null, farmerListingPrice = null }) {
  const [selectedCommodity, setSelectedCommodity] = useState('Tomato');
  const [selectedState, setSelectedState] = useState('Telangana');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [mandiResponse, setMandiResponse] = useState(null);
  const [error, setError] = useState(null);
  const [forecasts, setForecasts] = useState({});

  const fetchComparisonData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMandiResponse(null);
    setForecasts({});

    try {
      const response = await marketService.getMandiPrices({
        commodity: selectedCommodity,
        state: selectedState,
        district: selectedDistrict,
        date: selectedDate,
      });

      setMandiResponse(response);

      // If valid records returned, attempt to fetch baseline ML forecasts for distinct markets
      if (response && response.data && response.data.length > 0) {
        const uniqueMarkets = [...new Set(response.data.map((r) => r.market).filter(Boolean))];
        const forecastMap = {};

        await Promise.all(
          uniqueMarkets.map(async (mkt) => {
            try {
              const fc = await marketService.getPriceForecast({
                commodity: selectedCommodity,
                state: selectedState,
                market: mkt,
              });
              if (fc && fc.success) {
                forecastMap[mkt] = fc;
              } else {
                forecastMap[mkt] = { success: false, message: fc?.message || 'Forecast unavailable' };
              }
            } catch (e) {
              forecastMap[mkt] = { success: false, message: 'Forecast unavailable' };
            }
          })
        );

        setForecasts(forecastMap);
      }
    } catch (err) {
      setError(err?.message || 'Government market data unavailable');
    } finally {
      setLoading(false);
    }
  }, [selectedCommodity, selectedState, selectedDistrict, selectedDate]);

  useEffect(() => {
    fetchComparisonData();
  }, [fetchComparisonData]);

  // Derived state flags
  const isGovAvailable = mandiResponse && mandiResponse.source_status === 'available' && !error;
  const records = mandiResponse?.data || [];
  const retrievedAt = mandiResponse?.retrieved_at || mandiResponse?.source_retrieved_at;
  const dataDate = mandiResponse?.data_date;
  const cacheStatus = mandiResponse?.cache_status;

  // Derive demand signal from demand intelligence if supported for this commodity
  const getCommodityDemandLevel = () => {
    if (!demandIntelligence || !demandIntelligence.products) return null;
    const item = demandIntelligence.products.find(
      (p) => p.product.toLowerCase() === selectedCommodity.toLowerCase()
    );
    return item ? item.demand_level : null;
  };

  const commodityDemandLevel = getCommodityDemandLevel();

  // Generate dynamic market insights based strictly on returned data
  const generateInsights = () => {
    const insights = [];

    if (!isGovAvailable || records.length === 0) {
      insights.push({
        type: 'warning',
        text: 'Government market data is currently unavailable. No synthetic or estimated prices are substituted.',
      });
      insights.push({
        type: 'info',
        text: 'Price information will be displayed when official government data sources (data.gov.in / AGMARKNET) return records.',
      });
      return insights;
    }

    // Source confirmation insight
    insights.push({
      type: 'source',
      text: 'Price information was retrieved from the official government market data source (data.gov.in / AGMARKNET).',
    });

    // Market price comparison insight if multiple markets exist with valid prices
    const validPriceRecords = records.filter(
      (r) => r.normalized_price_per_kg !== null && r.normalized_price_per_kg !== undefined && r.market
    );

    if (validPriceRecords.length >= 2) {
      const sortedByPrice = [...validPriceRecords].sort(
        (a, b) => b.normalized_price_per_kg - a.normalized_price_per_kg
      );
      const highest = sortedByPrice[0];
      const lowest = sortedByPrice[sortedByPrice.length - 1];

      if (highest.normalized_price_per_kg > lowest.normalized_price_per_kg) {
        insights.push({
          type: 'comparison',
          text: `${highest.market} currently has a higher reported mandi price (₹${highest.normalized_price_per_kg}/kg) than ${lowest.market} (₹${lowest.normalized_price_per_kg}/kg).`,
        });
      } else if (highest.normalized_price_per_kg === lowest.normalized_price_per_kg) {
        insights.push({
          type: 'comparison',
          text: `Reported government mandi prices are equal across reporting markets (${highest.market} & ${lowest.market} at ₹${highest.normalized_price_per_kg}/kg).`,
        });
      }
    } else if (validPriceRecords.length === 1) {
      const rec = validPriceRecords[0];
      insights.push({
        type: 'comparison',
        text: `${rec.market} in ${rec.district || rec.state || 'region'} reported a government modal mandi price of ₹${rec.normalized_price_per_kg}/kg.`,
      });
    }

    // ML Forecast status insight
    const hasAnyValidForecast = Object.values(forecasts).some((f) => f && f.success);
    if (hasAnyValidForecast) {
      insights.push({
        type: 'ml',
        text: `ML Next-Day Forecast — Historical baseline model is available for ${selectedCommodity} in ${selectedState}.`,
      });
    } else {
      insights.push({
        type: 'ml',
        text: `Forecast is unavailable for ${selectedCommodity}${selectedState ? ' in ' + selectedState : ''}.`,
      });
    }

    // Distance status insight
    const hasAnyCoordinates = records.some((r) => r.latitude && r.longitude);
    if (!hasAnyCoordinates) {
      insights.push({
        type: 'distance',
        text: 'Distance could not be calculated because market coordinates are unavailable.',
      });
    }

    return insights;
  };

  const insightsList = generateInsights();
  const farmerLoc = locationService.getCurrentLocation();

  return (
    <div className="mi-section-card card market-comparison-card">
      {/* Header */}
      <div className="mi-section-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="mi-section-title text-xl font-bold text-slate-100">Market Comparison</h2>
          <p className="mi-section-sub text-sm text-slate-400">
            Compare available agricultural markets using current market information.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-purple">🏛️ Official Government Mandi Data</span>
          {cacheStatus && (
            <span className={`badge ${cacheStatus === 'fresh' ? 'badge-emerald' : 'badge-amber'}`}>
              {cacheStatus === 'fresh' ? 'Live Data' : 'Cached Data'}
            </span>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mc-filters-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
        {/* Commodity Filter */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mc-commodity-select" className="text-xs font-semibold text-slate-300">
            Commodity
          </label>
          <select
            id="mc-commodity-select"
            className="input-select bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
          >
            {COMMODITY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mc-state-select" className="text-xs font-semibold text-slate-300">
            State
          </label>
          <select
            id="mc-state-select"
            className="input-select bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mc-district-input" className="text-xs font-semibold text-slate-300">
            District
          </label>
          <input
            id="mc-district-input"
            type="text"
            placeholder="All Districts (e.g. Rangareddy)"
            className="input-text bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mc-date-input" className="text-xs font-semibold text-slate-300">
            Arrival Date (DD/MM/YYYY)
          </label>
          <div className="flex gap-2">
            <input
              id="mc-date-input"
              type="text"
              placeholder="DD/MM/YYYY (e.g. 27/09/2026)"
              className="input-text bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 flex-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              type="button"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              onClick={fetchComparisonData}
              disabled={loading}
            >
              <span>{loading ? '...' : 'Fetch'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="mi-spinner" />
          <span>Fetching market data from government servers...</span>
        </div>
      ) : error || !isGovAvailable || records.length === 0 ? (
        <div className="mc-unavailable-card p-6 bg-slate-900/40 border border-amber-900/40 rounded-xl text-center my-4">
          <div className="text-3xl mb-2">🏛️</div>
          <h3 className="text-lg font-bold text-amber-400 mb-1">Government market data unavailable</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {error || mandiResponse?.message || `No government market records returned for ${selectedCommodity} in ${selectedState}.`}
          </p>
          <p className="text-xs text-slate-500 mt-3 font-mono">
            Source: Government of India (data.gov.in / AGMARKNET) — No fake prices substituted.
          </p>
        </div>
      ) : (
        <div className="mc-table-container overflow-x-auto my-4 rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-800 uppercase tracking-wider text-xs">
                <th className="p-3 font-semibold">Market</th>
                <th className="p-3 font-semibold">District</th>
                <th className="p-3 font-semibold text-right">Market Price</th>
                <th className="p-3 font-semibold">Price Unit</th>
                <th className="p-3 font-semibold">Demand</th>
                <th className="p-3 font-semibold">Expected Tomorrow</th>
                <th className="p-3 font-semibold text-right">Distance</th>
                <th className="p-3 font-semibold">Price Updated</th>
                <th className="p-3 font-semibold">Updated</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-200">
              {records.map((r, idx) => {
                // Current Price formatting
                const hasPrice = r.normalized_price_per_kg !== null && r.normalized_price_per_kg !== undefined;
                const priceDisplay = hasPrice ? `₹${r.normalized_price_per_kg}/kg` : 'Government market data unavailable';
                const originalSub = r.modal_price ? `(Original: ₹${r.modal_price}/${r.original_price_unit || 'Qtl'})` : '';

                // ML Forecast formatting
                const mktForecast = forecasts[r.market];
                let forecastDisplay = 'Forecast unavailable';
                let forecastSub = '';
                if (mktForecast && mktForecast.success) {
                  forecastDisplay = `₹${mktForecast.predicted_price_per_kg}/kg`;
                  forecastSub = 'Based on past market prices';
                }

                // Distance formatting
                let distanceDisplay = 'Distance unavailable';
                if (r.latitude && r.longitude && farmerLoc?.latitude && farmerLoc?.longitude) {
                  const dist = locationService.calculateDistance(
                    farmerLoc.latitude,
                    farmerLoc.longitude,
                    r.latitude,
                    r.longitude
                  );
                  distanceDisplay = `${dist} km`;
                }

                // Freshness formatting
                const dateVal = r.data_date || r.date || dataDate || 'Latest Available';
                const timeVal = retrievedAt
                  ? new Date(retrievedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : null;
                const freshnessDisplay = timeVal ? `Retrieved: ${timeVal}` : cacheStatus === 'fresh' ? 'Live Data' : 'Cached';

                return (
                  <tr key={`${r.market}-${idx}`} className="hover:bg-slate-900/40 transition-colors">
                    {/* Market */}
                    <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">
                      {r.market || 'Unknown Market'}
                      {r.variety && <div className="text-[11px] font-normal text-slate-400">{r.variety}</div>}
                    </td>

                    {/* District */}
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {r.district ? `${r.district}, ${r.state}` : r.state || '—'}
                    </td>

                    {/* Current Price */}
                    <td className="p-3 text-right font-semibold whitespace-nowrap">
                      {hasPrice ? (
                        <div>
                          <span className="text-purple-300 text-sm font-bold">₹{r.normalized_price_per_kg}/kg</span>
                          {originalSub && <div className="text-[10px] text-slate-400 font-mono">{originalSub}</div>}
                        </div>
                      ) : (
                        <span className="text-amber-400 text-xs font-normal">Government market data unavailable</span>
                      )}
                    </td>

                    {/* Price Unit */}
                    <td className="p-3 text-slate-400 whitespace-nowrap">₹/kg</td>

                    {/* Demand */}
                    <td className="p-3 whitespace-nowrap">
                      {commodityDemandLevel ? (
                        <DemandBadge level={commodityDemandLevel} size="sm" />
                      ) : (
                        <span className="text-slate-400 text-xs italic">Demand data unavailable</span>
                      )}
                    </td>

                    {/* ML Forecast */}
                    <td className="p-3 whitespace-nowrap">
                      {mktForecast && mktForecast.success ? (
                        <div>
                          <span className="font-semibold text-emerald-400 text-xs">{forecastDisplay}</span>
                          <div className="text-[10px] text-emerald-300/70">{forecastSub}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Forecast unavailable</span>
                      )}
                    </td>

                    {/* Distance */}
                    <td className="p-3 text-right whitespace-nowrap text-slate-400 font-mono text-xs">
                      {distanceDisplay}
                    </td>

                    {/* Data Date */}
                    <td className="p-3 font-mono text-xs text-slate-300 whitespace-nowrap">{dateVal}</td>

                    {/* Freshness */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-xs text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        {freshnessDisplay}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Market Insight Card */}
      <div className="mc-insight-card bg-slate-900/60 border border-slate-800 rounded-xl p-4 my-2">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-lg">💡</span>
          <h3 className="text-sm font-bold text-slate-200">Market Insight</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-300">
          {insightsList.map((ins, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-0.5">•</span>
              <span>{ins.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap justify-between gap-2">
          <span>
            Source: <strong>Government of India — data.gov.in / AGMARKNET</strong>
          </span>
          {retrievedAt && <span>Retrieved: {new Date(retrievedAt).toLocaleTimeString()}</span>}
        </div>
      </div>
    </div>
  );
}
