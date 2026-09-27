import React, { useState } from 'react';
import FarmerActionCard from './FarmerActionCard';

/**
 * MarketGuidanceCard Component — Step 3 Simple Market Opportunity Guidance
 * Evaluates real market signals (current price, demand, trend, forecasts, comparison markets)
 * using transparent rules and presents a simple 5-second farmer-facing status:
 * 🟢 GOOD MARKET | 🟡 NORMAL MARKET | 🟠 CHECK OTHER MARKETS | ⚪ NOT ENOUGH INFORMATION
 *
 * Strict Data Integrity: Never guarantees profit, never forces recommendations, never invents data.
 */
export default function MarketGuidanceCard({
  commodity = 'Tomato',
  commodityEmoji = '🍅',
  currentPrice = null,
  currentMarket = 'Bowenpally',
  demandLevel = 'NONE',
  trendDirection = 'UNAVAILABLE', // 'UP' | 'STABLE' | 'DOWN' | 'UNAVAILABLE'
  priceChangePct = null,
  forecastPrice = null,
  otherMarkets = [], // [{ market: 'Warangal', price: 31, distance: 48 }]
  onRefresh,
  loading = false,
  error = null,
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className="card guidance-card p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl my-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">💡</span>
          <h3 className="font-bold text-slate-100 text-base uppercase tracking-wider">
            Market Guidance
          </h3>
        </div>
        <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <div className="mi-spinner" />
          <span>Evaluating current market information for {commodity}...</span>
        </div>
      </div>
    );
  }

  // Evaluate Guidance Logic based strictly on actual returned data
  const evaluateGuidance = () => {
    // State 1: Insufficient / Missing Data
    if (
      (currentPrice === null || currentPrice === undefined || currentPrice <= 0) &&
      (demandLevel === 'NONE' || demandLevel === 'UNAVAILABLE') &&
      (!otherMarkets || otherMarkets.length === 0)
    ) {
      return {
        status: '⚪ NOT ENOUGH INFORMATION',
        pillClass: 'bg-slate-800 text-slate-300 border-slate-700',
        reason: 'Not enough market information is available right now.',
        type: 'insufficient',
      };
    }

    // State 2: Check Other Markets (if another real government mandi has a materially higher price)
    const validOtherMarkets = (otherMarkets || []).filter(
      (m) => m && m.price !== null && m.price !== undefined && m.price > 0 && m.market !== currentMarket
    );

    if (currentPrice !== null && currentPrice > 0 && validOtherMarkets.length > 0) {
      const higherMarkets = validOtherMarkets.filter((m) => m.price >= currentPrice + 1.5);
      if (higherMarkets.length > 0) {
        // Sort to find market with highest price
        higherMarkets.sort((a, b) => b.price - a.price);
        const topMkt = higherMarkets[0];
        const distStr = topMkt.distance ? ` (${topMkt.distance} km away)` : '';
        return {
          status: '🟠 CHECK OTHER MARKETS',
          pillClass: 'bg-orange-950/90 text-orange-400 border-orange-800',
          reason: `${topMkt.market} has a higher reported market price (₹${Math.round(topMkt.price)}/kg${distStr}). Check market details before deciding.`,
          type: 'other_markets',
          topMkt,
        };
      }
    }

    // State 3: Good Market
    const isDemandHigh = demandLevel === 'HIGH';
    const isDemandNormal = demandLevel === 'MEDIUM' || demandLevel === 'NORMAL';
    const isTrendUp = trendDirection === 'UP' || (priceChangePct !== null && priceChangePct >= 2.0);

    if (currentPrice !== null && currentPrice > 0) {
      if (isDemandHigh && isTrendUp) {
        return {
          status: '🟢 GOOD MARKET',
          pillClass: 'bg-emerald-950/90 text-emerald-400 border-emerald-800',
          reason: 'Price has been going up and demand is high.',
          type: 'good',
        };
      }
      if (isDemandHigh) {
        return {
          status: '🟢 GOOD MARKET',
          pillClass: 'bg-emerald-950/90 text-emerald-400 border-emerald-800',
          reason: 'Price is good and demand is high.',
          type: 'good',
        };
      }
      if (isTrendUp && isDemandNormal) {
        return {
          status: '🟢 GOOD MARKET',
          pillClass: 'bg-emerald-950/90 text-emerald-400 border-emerald-800',
          reason: 'Price has been going up and demand is normal.',
          type: 'good',
        };
      }
    }

    // State 4: Normal Market
    if (currentPrice !== null && currentPrice > 0) {
      if (demandLevel === 'LOW') {
        return {
          status: '🟡 NORMAL MARKET',
          pillClass: 'bg-amber-950/90 text-amber-400 border-amber-800',
          reason: 'Market price is available, but buyer demand is currently low.',
          type: 'normal',
        };
      }
      if (demandLevel === 'NONE' || demandLevel === 'UNAVAILABLE') {
        return {
          status: '🟡 NORMAL MARKET',
          pillClass: 'bg-amber-950/90 text-amber-400 border-amber-800',
          reason: 'Market price is available, but demand information is unavailable.',
          type: 'normal',
        };
      }
      return {
        status: '🟡 NORMAL MARKET',
        pillClass: 'bg-amber-950/90 text-amber-400 border-amber-800',
        reason: 'Price and demand are currently stable.',
        type: 'normal',
      };
    }

    return {
      status: '⚪ NOT ENOUGH INFORMATION',
      pillClass: 'bg-slate-800 text-slate-300 border-slate-700',
      reason: 'Not enough market information is available right now.',
      type: 'insufficient',
    };
  };

  const guidance = evaluateGuidance();

  return (
    <div className="card guidance-card p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl my-4 text-slate-100 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{commodityEmoji}</span>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <span>{commodity.toUpperCase()} — MARKET GUIDANCE</span>
            </h3>
            <span className="text-xs text-slate-400">
              Does this market currently look good, normal, or worth checking?
            </span>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Informational Guidance
        </span>
      </div>

      {/* Main Guidance Banner */}
      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Market Status
          </span>
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-extrabold border ${guidance.pillClass}`}
          >
            {guidance.status}
          </span>
        </div>

        {/* Transparent Reason */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Reason:</span>
          <p className="text-base font-bold text-slate-100 leading-snug">
            "{guidance.reason}"
          </p>
        </div>
      </div>

      {/* Step 4: Simple Farmer Actions */}
      <FarmerActionCard
        guidanceStatus={guidance.status}
        trendDirection={trendDirection}
        onRefresh={onRefresh}
        loading={loading}
        error={error}
      />

      {/* Details Section */}
      <div className="mt-3 pt-2">
        <button
          type="button"
          className="text-[11px] text-slate-400 hover:text-slate-300 font-medium flex items-center gap-1 focus:outline-none"
          onClick={() => setShowDetails((v) => !v)}
        >
          <span>{showDetails ? '▲ Hide details' : '▼ View details'}</span>
        </button>

        {showDetails && (
          <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono">
            <div>• Market: {currentMarket}</div>
            <div>• Data Source: Government of India (data.gov.in / AGMARKNET)</div>
            <div>• Guidance Method: Rule-based evaluation of real prices, demand signals &amp; market comparisons.</div>
            <div>• Note: Informational guidance only. No guaranteed profit or forced action. Check market details before deciding.</div>
          </div>
        )}
      </div>
    </div>
  );
}
