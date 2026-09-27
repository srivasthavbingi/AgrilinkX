import React from 'react';

/**
 * DemandCard Component — Step 2 Simple Demand Intelligence
 * Displays simple demand indicator: 🟢 HIGH DEMAND, 🟡 NORMAL DEMAND, 🔴 LOW DEMAND, or Unavailable.
 * Uses simple farmer-first terminology and data-backed explanation.
 */
export default function DemandCard({
  id,
  demandLevel = 'NONE',
  orderedQty = 0,
  orderCount = 0,
  unit = 'kg',
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div id={id} className="card simple-card demand-card p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span>
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">Demand</h3>
        </div>
        <div className="py-4 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <div className="mi-spinner" />
          <span>Checking current demand information...</span>
        </div>
      </div>
    );
  }

  if (error || demandLevel === 'NONE' || demandLevel === 'UNAVAILABLE') {
    return (
      <div id={id} className="card simple-card demand-card p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📊</span>
            <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">Demand</h3>
          </div>
          <div className="my-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              ⚪ Demand information unavailable
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Demand information is unavailable. Not enough order data to calculate demand.
        </p>
      </div>
    );
  }

  // Map classification to farmer-first visual indicator and label
  const CONFIG = {
    HIGH: {
      indicator: '🟢 HIGH DEMAND',
      pillClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
      explanation: orderCount > 0
        ? `Many recent orders (${orderCount} orders, ${orderedQty} ${unit} requested).`
        : 'High buyer interest detected on AgriLinkX platform.',
    },
    MEDIUM: {
      indicator: '🟡 NORMAL DEMAND',
      pillClass: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
      explanation: 'Demand is currently normal based on recent platform activity.',
    },
    NORMAL: {
      indicator: '🟡 NORMAL DEMAND',
      pillClass: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
      explanation: 'Demand is currently normal based on recent platform activity.',
    },
    LOW: {
      indicator: '🔴 LOW DEMAND',
      pillClass: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
      explanation: 'Buyer demand is currently low based on recent platform activity.',
    },
  };

  const currentCfg = CONFIG[demandLevel] || {
    indicator: '⚪ Demand information unavailable',
    pillClass: 'bg-slate-800 text-slate-300 border-slate-700',
    explanation: 'Demand information is unavailable.',
  };

  return (
    <div id={id} className="card simple-card demand-card p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between shadow-lg">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span>
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">Demand</h3>
        </div>
        <div className="my-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${currentCfg.pillClass}`}>
            {currentCfg.indicator}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
        {currentCfg.explanation}
      </p>
    </div>
  );
}
