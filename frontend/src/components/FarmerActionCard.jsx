import React from 'react';

/**
 * FarmerActionCard Component — Step 4 Simple Farmer Actions
 * Provides simple, non-directive next action buttons based on the evaluated market guidance status.
 * Buttons execute smooth scrolling to relevant page sections or trigger data refresh.
 * Strictly adheres to neutrality: NO financial instructions, NO guaranteed profit claims.
 */
export default function FarmerActionCard({
  guidanceStatus = '⚪ NOT ENOUGH INFORMATION',
  trendDirection = 'UNAVAILABLE',
  onCompareMarkets,
  onCheckTrend,
  onViewDemand,
  onRefresh,
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div className="card farmer-action-card p-4 bg-slate-900/90 border border-slate-800 rounded-xl my-3">
        <div className="py-3 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <div className="mi-spinner" />
          <span>Updating available actions...</span>
        </div>
      </div>
    );
  }

  // Determine actions based on status
  const isInsufficient =
    error ||
    guidanceStatus.includes('NOT ENOUGH INFORMATION') ||
    guidanceStatus.includes('⚪');

  const isCheckOther = guidanceStatus.includes('CHECK OTHER MARKETS') || guidanceStatus.includes('🟠');
  const isGood = guidanceStatus.includes('GOOD MARKET') || guidanceStatus.includes('🟢');
  const isGoingDown = trendDirection === 'DOWN' || guidanceStatus.includes('Going Down');

  // Helper smooth scroll handler fallback if prop not passed
  const handleScrollTo = (selector) => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const triggerCompare = onCompareMarkets || (() => handleScrollTo('#market-comparison, .market-comparison-card'));
  const triggerTrend = onCheckTrend || (() => handleScrollTo('#price-trend, .simple-price-trend'));
  const triggerDemand = onViewDemand || (() => handleScrollTo('#demand-insights, .demand-card'));

  return (
    <div className="card farmer-action-card p-4 bg-slate-900 border border-slate-800 rounded-xl my-3 shadow-md bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🚀</span>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {isInsufficient ? 'More information is needed.' : 'What you can do'}
          </h4>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Farmer Actions</span>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {isInsufficient ? (
          <button
            type="button"
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer col-span-full sm:col-span-1"
            onClick={onRefresh}
          >
            <span>🔄</span>
            <span>Refresh Market Information</span>
          </button>
        ) : isCheckOther ? (
          <>
            <button
              type="button"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={triggerCompare}
            >
              <span>📊</span>
              <span>Compare Markets</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-2.5 bg-orange-950/80 hover:bg-orange-900 text-orange-200 border border-orange-800/80 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={triggerCompare}
            >
              <span>📍</span>
              <span>View Other Markets</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={triggerTrend}
            >
              <span>📈</span>
              <span>Check Price Trend</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={triggerCompare}
            >
              <span>📊</span>
              <span>Compare Markets</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={triggerTrend}
            >
              <span>📈</span>
              <span>Check Price Trend</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={triggerDemand}
            >
              <span>📦</span>
              <span>View Demand</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
