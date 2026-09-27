import React, { useState, useEffect } from 'react';
import marketService from '../services/marketService';

// Named configuration constant for recommendation threshold
// Rationale: A 2% price movement threshold accounts for normal intraday market variance and transaction costs; predicted increases >= +2% suggest HOLD, decreases <= -2% suggest SELL, while changes within ±2% indicate price stability (MAINTAIN).
const PRICE_CHANGE_THRESHOLD_PERCENT = 2.0;

const MLPriceForecastCard = ({
  selectedCommodity = 'Maize',
  selectedState = 'Telangana',
  selectedMarket = '',
  currentMandiPrice = null,
  farmerListingPrice = null,
  govMandiPrice = null,
}) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showTechDetails, setShowTechDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    marketService
      .getPriceForecast({
        commodity: selectedCommodity,
        state: selectedState,
        market: selectedMarket,
      })
      .then((data) => {
        if (isMounted) {
          if (data && data.success) {
            setForecast(data);
          } else {
            setError(data?.message || 'ML forecast temporarily unavailable.');
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('ML forecast temporarily unavailable.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCommodity, selectedState, selectedMarket]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-slate-100 my-4">
        <div className="py-6 text-center text-slate-400 text-sm animate-pulse flex items-center justify-center space-x-2">
          <span>🤖</span>
          <span>Loading ML price forecast...</span>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-slate-100 my-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-semibold text-lg text-emerald-400">ML Next-Day Forecast</h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            Historical baseline model
          </span>
        </div>
        <div className="py-3 px-4 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-300 text-sm">
          {error || 'ML forecast temporarily unavailable.'}
        </div>
      </div>
    );
  }

  const predictedPrice = forecast.predicted_price_per_kg;

  // Strict live government mandi price dereferencing (NO silent substitution of platform average or ML forecast)
  const validCurrentPrice = currentMandiPrice !== null && currentMandiPrice > 0 
    ? currentMandiPrice 
    : (govMandiPrice !== null && govMandiPrice > 0 ? govMandiPrice : null);

  const activeListingPrice = farmerListingPrice !== null && farmerListingPrice > 0 ? farmerListingPrice : null;

  let priceDiff = null;
  let pctChange = null;
  let hasValidComparison = false;

  if (validCurrentPrice !== null && validCurrentPrice > 0) {
    priceDiff = predictedPrice - validCurrentPrice;
    pctChange = (priceDiff / validCurrentPrice) * 100;
    hasValidComparison = true;
  }

  // Dynamic recommendation logic based on PRICE_CHANGE_THRESHOLD_PERCENT
  let recommendation = {
    badge: '🟡 MAINTAIN — Price expected to stay stable',
    badgeClass: 'bg-amber-950 text-amber-400 border-amber-800',
    reason: 'Forecast predicts price will remain stable next day within expected market variance.',
    opportunity: activeListingPrice 
      ? `Maintain listing price around ₹${activeListingPrice.toFixed(2)}/kg` 
      : 'Maintain current price positioning.',
  };

  if (!hasValidComparison) {
    recommendation = {
      badge: '⚪ MAINTAIN — Comparison unavailable',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      reason: 'Live government mandi price unavailable for comparison.',
      opportunity: activeListingPrice 
        ? `Listing price active at ₹${activeListingPrice.toFixed(2)}/kg` 
        : 'No active listing found.',
    };
  } else if (pctChange >= PRICE_CHANGE_THRESHOLD_PERCENT) {
    recommendation = {
      badge: '🟢 HOLD — Expected price increase',
      badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800',
      reason: `Forecast predicts price will rise to ₹${predictedPrice.toFixed(2)}/kg (+${pctChange.toFixed(1)}%).`,
      opportunity: `Consider increasing listing price toward ₹${Math.round(predictedPrice)}/kg`,
    };
  } else if (pctChange <= -PRICE_CHANGE_THRESHOLD_PERCENT) {
    recommendation = {
      badge: '🔴 SELL — Expected price decrease',
      badgeClass: 'bg-rose-950 text-rose-400 border-rose-800',
      reason: `Forecast predicts price will decrease to ₹${predictedPrice.toFixed(2)}/kg (${pctChange.toFixed(1)}%).`,
      opportunity: `Lock in sales at current government mandi rate of ₹${validCurrentPrice.toFixed(2)}/kg`,
    };
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🌾</span>
          <div>
            <h3 className="font-bold text-lg text-slate-100">
              {forecast.commodity.toUpperCase()} — MARKET INTELLIGENCE
            </h3>
            <span className="text-xs text-slate-400">
              State: {forecast.state} {forecast.market ? `• Market: ${forecast.market}` : ''}
            </span>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          Historical baseline model
        </span>
      </div>

      <div className="space-y-5">
        {/* Main Price Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Mandi Price */}
          <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Government Mandi Price</span>
              <span className="text-2xl font-bold text-slate-100">
                {validCurrentPrice !== null 
                  ? <>₹{validCurrentPrice.toFixed(2)}<span className="text-sm font-normal text-slate-400">/kg</span></> 
                  : <span className="text-base font-normal text-slate-400">Unavailable</span>}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block mb-1">Government Source</span>
              <span className="text-xs font-medium text-slate-300 block">
                data.gov.in / AGMARKNET
              </span>
            </div>
          </div>

          {/* ML Forecast */}
          <div className="bg-slate-950/70 p-4 rounded-lg border border-emerald-900/50 flex justify-between items-center">
            <div>
              <span className="text-xs text-emerald-400 font-medium block mb-1">ML Next-Day Forecast</span>
              <span className="text-2xl font-bold text-emerald-400">
                ₹{predictedPrice.toFixed(2)}<span className="text-sm font-normal text-emerald-500">/kg</span>
              </span>
            </div>
            <div className="text-right">
              {hasValidComparison ? (
                <span className={`text-sm font-bold flex items-center justify-end ${priceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {priceDiff >= 0 ? '↑' : '↓'} {Math.abs(pctChange).toFixed(1)}%
                </span>
              ) : (
                <span className="text-xs text-slate-400 block">Comparison unavailable</span>
              )}
              <span className="text-xs text-slate-400 block mt-0.5">{forecast.model_name || forecast.model}</span>
            </div>
          </div>
        </div>

        {/* Action Recommendation Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recommended Action
            </span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${recommendation.badgeClass}`}>
              {recommendation.badge}
            </span>
          </div>

          <div className="text-sm text-slate-300">
            <span className="font-semibold text-slate-200">Reason: </span>
            {recommendation.reason}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block">Your Current Listing:</span>
              <span className="font-semibold text-slate-200 text-sm">
                {activeListingPrice ? `₹${activeListingPrice.toFixed(2)}/kg` : 'No active listing found.'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Potential Opportunity:</span>
              <span className="font-semibold text-emerald-400 text-sm">{recommendation.opportunity}</span>
            </div>
          </div>
        </div>

        {/* Model Metadata Footer (Level 3 Details) */}
        <div className="pt-1">
          <button
            type="button"
            className="text-[11px] text-slate-400 hover:text-slate-300 font-medium flex items-center gap-1 focus:outline-none"
            onClick={() => setShowTechDetails((v) => !v)}
          >
            <span>{showTechDetails ? '▲ Hide technical details' : '▼ View technical details'}</span>
          </button>

          {showTechDetails && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-950/40 px-3 py-2 rounded border border-slate-800/50 font-mono">
              <span>Model: {forecast.model_name || forecast.model || 'RandomForestRegressor'}</span>
              <span>Historical training: {forecast.training_date_range || '2017-01-02 → 2017-06-21'}</span>
              <span>MAE: {forecast.mae} ₹/kg</span>
              {forecast.rmse && <span>RMSE: {forecast.rmse} ₹/kg</span>}
              <span>R²: {forecast.r2}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 italic mt-1">
          {forecast.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default MLPriceForecastCard;

