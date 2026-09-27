import React, { useState, useEffect } from 'react';
import marketService from '../services/marketService';

/**
 * ExpectedPriceCard Component — Step 2 Expected Price Tomorrow
 * Displays simple farmer-facing expected price tomorrow using baseline ML forecast where supported.
 * For unsupported commodities/regions: Displays "Expected price unavailable".
 * Technical details exist in a small collapsible Details section.
 */
export default function ExpectedPriceCard({
  commodity = 'Maize',
  state = 'Telangana',
  market = '',
}) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setForecast(null);

    marketService
      .getPriceForecast({ commodity, state, market })
      .then((data) => {
        if (isMounted) {
          if (data && data.success) {
            setForecast(data);
          } else {
            setError(data?.message || 'Expected price unavailable');
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Expected price unavailable');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [commodity, state, market]);

  if (loading) {
    return (
      <div className="card simple-card expected-price-card p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📈</span>
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">
            Expected Price Tomorrow
          </h3>
        </div>
        <div className="py-4 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <div className="mi-spinner" />
          <span>Checking expected price...</span>
        </div>
      </div>
    );
  }

  const isForecastAvailable = forecast && forecast.success && forecast.predicted_price_per_kg;

  if (error || !isForecastAvailable) {
    return (
      <div className="card simple-card expected-price-card p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📈</span>
            <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">
              Expected Price Tomorrow
            </h3>
          </div>
          <div className="my-2">
            <span className="text-xl font-bold text-slate-400">Expected price unavailable</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Expected price tomorrow is currently unavailable for {commodity}.
        </p>
      </div>
    );
  }

  const predictedVal = Math.round(forecast.predicted_price_per_kg);

  return (
    <div className="card simple-card expected-price-card p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between shadow-lg">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📈</span>
          <h3 className="font-semibold text-emerald-400 text-sm uppercase tracking-wider">
            Expected Price Tomorrow
          </h3>
        </div>

        <div className="my-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-emerald-400">₹{predictedVal}</span>
          <span className="text-sm font-semibold text-slate-400">/ kg</span>
        </div>

        <p className="text-xs text-slate-300 font-medium">Based on past market prices</p>
      </div>

      {/* Small Details Section */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <button
          type="button"
          className="text-[11px] text-slate-400 hover:text-slate-300 font-medium flex items-center gap-1 focus:outline-none"
          onClick={() => setShowDetails((v) => !v)}
        >
          <span>{showDetails ? '▲ Hide details' : '▼ View details'}</span>
        </button>

        {showDetails && (
          <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800 space-y-1 font-mono">
            <div>AI estimate based on historical market prices.</div>
            <div>Model trained on verified historical mandi data.</div>
            {forecast.mae && <div>Average error: ±₹{forecast.mae}/kg</div>}
          </div>
        )}
      </div>
    </div>
  );
}
