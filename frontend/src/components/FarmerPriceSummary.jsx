import React from 'react';

/**
 * FarmerPriceSummary Component — Step 2 Farmer-First Instant Summary
 * Answers the 5 core farmer questions in under 5 seconds using plain everyday language:
 * 1. Current Market Price
 * 2. Demand
 * 3. Expected Price Tomorrow
 * 4. Simple Price Change / Trend
 * 5. What this means for me (Neutral, data-backed explanation)
 */
export default function FarmerPriceSummary({
  commodity = 'Tomato',
  commodityEmoji = '🍅',
  marketPrice = null,
  priceUnit = 'kg',
  priceUpdated = null,
  lastUpdated = null,
  demandLevel = 'NONE',
  expectedTomorrow = null,
  distanceKm = null,
  locationName = 'Hyderabad',
  priceChangePct = null,
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div className="card farmer-summary-card p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="py-6 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <div className="mi-spinner" />
          <span>Checking current market information for {commodity}...</span>
        </div>
      </div>
    );
  }

  // Format values
  const formattedPrice =
    marketPrice !== null && marketPrice !== undefined && marketPrice > 0
      ? `₹${Math.round(marketPrice)} / ${priceUnit}`
      : 'Market price unavailable right now.';

  const formattedExpected =
    expectedTomorrow !== null && expectedTomorrow !== undefined && expectedTomorrow > 0
      ? `₹${Math.round(expectedTomorrow)} / ${priceUnit}`
      : 'Expected price unavailable';

  const formattedDistance =
    distanceKm !== null && distanceKm !== undefined
      ? `${distanceKm} km away`
      : 'Distance unavailable';

  // Map demand indicator
  const DEMAND_CONFIG = {
    HIGH: { pill: '🟢 Demand is HIGH', cls: 'text-emerald-400 bg-emerald-950/80 border-emerald-800' },
    MEDIUM: { pill: '🟡 Demand is NORMAL', cls: 'text-amber-400 bg-amber-950/80 border-amber-800' },
    NORMAL: { pill: '🟡 Demand is NORMAL', cls: 'text-amber-400 bg-amber-950/80 border-amber-800' },
    LOW: { pill: '🔴 Demand is LOW', cls: 'text-rose-400 bg-rose-950/80 border-rose-800' },
    NONE: { pill: '⚪ Demand information unavailable', cls: 'text-slate-300 bg-slate-800 border-slate-700' },
  };
  const demandCfg = DEMAND_CONFIG[demandLevel] || DEMAND_CONFIG.NONE;

  // Generate neutral, data-backed "What this means" explanation
  const generateMeaning = () => {
    if (marketPrice === null || marketPrice === undefined || marketPrice <= 0) {
      return 'Government market price is currently unavailable. Check back when reporting updates.';
    }

    const sentences = [];

    if (demandLevel === 'HIGH') {
      sentences.push('Demand is high in the market.');
    } else if (demandLevel === 'MEDIUM' || demandLevel === 'NORMAL') {
      sentences.push('Demand is normal.');
    } else if (demandLevel === 'LOW') {
      sentences.push('Demand is currently low.');
    }

    if (expectedTomorrow !== null && expectedTomorrow > 0) {
      const expDiff = expectedTomorrow - marketPrice;
      if (expDiff > 1) {
        sentences.push(`Expected price tomorrow (₹${Math.round(expectedTomorrow)}/${priceUnit}) is slightly higher than today's market price.`);
      } else if (expDiff < -1) {
        sentences.push(`Expected price tomorrow (₹${Math.round(expectedTomorrow)}/${priceUnit}) is slightly lower than today's market price.`);
      } else {
        sentences.push('Expected price tomorrow is similar to today.');
      }
    }

    if (priceChangePct !== null && Math.abs(priceChangePct) >= 2) {
      if (priceChangePct > 0) {
        sentences.push(`Price has increased by ${Math.round(priceChangePct)}%.`);
      } else {
        sentences.push(`Price has decreased by ${Math.round(Math.abs(priceChangePct))}%.`);
      }
    }

    if (sentences.length === 0) {
      return `Current market price is ₹${Math.round(marketPrice)}/${priceUnit} from official government data.`;
    }

    return sentences.join(' ');
  };

  const meaningText = generateMeaning();

  return (
    <div className="card farmer-summary-card p-6 bg-slate-900 border border-emerald-900/60 rounded-2xl shadow-2xl text-slate-100 my-4 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{commodityEmoji}</span>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>{commodity}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-normal">
                Farmer Summary
              </span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>Government market price</span>
              {priceUpdated && <span className="font-mono">• Price Updated: {priceUpdated}</span>}
              {lastUpdated && <span className="font-mono">• Last Updated: {lastUpdated}</span>}
            </div>
          </div>
        </div>

        {/* Location & Distance */}
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-end gap-1">
            <span>📍 Distance from You:</span>
          </div>
          <div className="text-sm font-bold text-emerald-400">
            {locationName} {distanceKm !== null ? `(${formattedDistance})` : `• ${formattedDistance}`}
          </div>
        </div>
      </div>

      {/* 4 Core Answers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {/* Answer 1: Current Market Price */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            1. Current Market Price
          </span>
          {marketPrice !== null && marketPrice > 0 ? (
            <div>
              <div className="text-3xl font-extrabold text-slate-100">{formattedPrice}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Government market price</span>
            </div>
          ) : (
            <div className="text-sm text-amber-400 font-semibold my-1">
              Market price unavailable right now.
            </div>
          )}
        </div>

        {/* Answer 2: Demand */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            2. Demand
          </span>
          <div className="my-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${demandCfg.cls}`}>
              {demandCfg.pill}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Based on recent platform orders</span>
        </div>

        {/* Answer 3: Expected Price Tomorrow */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            3. Expected Price Tomorrow
          </span>
          {expectedTomorrow !== null && expectedTomorrow > 0 ? (
            <div>
              <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
                <span>📈</span>
                <span>{formattedExpected}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Based on past market prices</span>
            </div>
          ) : (
            <div className="text-sm text-slate-400 font-medium my-1">
              Expected price unavailable
            </div>
          )}
        </div>
      </div>

      {/* Answer 5: What this information means for me */}
      <div className="bg-slate-950/90 border border-emerald-900/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">💡</span>
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            What this means for you
          </h4>
        </div>
        <p className="text-sm text-slate-200 font-medium leading-relaxed">
          "{meaningText}"
        </p>
      </div>
    </div>
  );
}
