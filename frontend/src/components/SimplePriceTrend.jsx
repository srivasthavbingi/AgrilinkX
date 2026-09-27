import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

/**
 * SimplePriceTrend Component — Step 2 Simple Price Trend
 * Displays a simple 7-record Recharts line chart and a one-sentence trend interpretation statement.
 * Calculates direction strictly from actual available historical records.
 * NEVER fabricates fake points.
 */
export default function SimplePriceTrend({
  id,
  trendData = [],
  commodity = 'Tomato',
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div id={id} className="card simple-card simple-price-trend p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📊</span>
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider">Price Trend</h3>
        </div>
        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <div className="mi-spinner" />
          <span>Loading price trend...</span>
        </div>
      </div>
    );
  }

  // Filter valid data points with numeric price
  const validPoints = (trendData || [])
    .filter((d) => d && (d.avg_price !== undefined || d.price !== undefined || d.modal_price !== undefined))
    .map((d) => {
      const rawPrice = d.avg_price ?? d.price ?? d.modal_price ?? 0;
      const numericPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;
      return {
        date: d.date || d.data_date || 'Date',
        price: Math.round(numericPrice),
        rawPrice: numericPrice,
      };
    })
    .filter((d) => d.price > 0)
    .slice(-7); // Last 7 available records

  const hasTrend = validPoints.length >= 2;
  const hasSinglePoint = validPoints.length === 1;

  // Calculate trend direction statement
  let trendStatement = 'Not enough price information to show a trend.';
  let trendIcon = 'ℹ️';

  if (hasTrend) {
    const firstPrice = validPoints[0].rawPrice;
    const lastPrice = validPoints[validPoints.length - 1].rawPrice;
    const diff = lastPrice - firstPrice;
    const pctChange = firstPrice > 0 ? (diff / firstPrice) * 100 : 0;

    if (pctChange >= 2.0) {
      trendIcon = '📈';
      const pctRounded = Math.round(Math.abs(pctChange));
      trendStatement = `📈 Price is going up. (${pctRounded > 0 ? 'Price increased by ' + pctRounded + '%' : 'Upward movement'})`;
    } else if (pctChange <= -2.0) {
      trendIcon = '📉';
      const pctRounded = Math.round(Math.abs(pctChange));
      trendStatement = `📉 Price is going down. (${pctRounded > 0 ? 'Price decreased by ' + pctRounded + '%' : 'Downward movement'})`;
    } else {
      trendIcon = '→';
      trendStatement = '→ Price is mostly stable.';
    }
  } else if (hasSinglePoint) {
    trendStatement = `Current price reported at ₹${validPoints[0].price}/kg. Not enough price information to show a trend.`;
  }

  return (
    <div id={id} className="card simple-card simple-price-trend p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm uppercase tracking-wider">
                Price Trend
              </h3>
              <p className="text-xs text-slate-400">Has the price been going up or down?</p>
            </div>
          </div>
          {hasTrend && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
              {validPoints.length} Records
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      {!hasTrend && !hasSinglePoint ? (
        <div className="py-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-lg border border-slate-800/80 my-2">
          <span className="text-2xl block mb-1">📉</span>
          <span>Price trend unavailable for {commodity}.</span>
        </div>
      ) : (
        <div className="my-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={validPoints} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(d) => (d.length > 5 ? d.slice(5) : d)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  formatter={(val) => [`₹${val}/kg`, 'Market Price']}
                  labelFormatter={(l) => `Price Updated: ${l}`}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* One-Sentence Trend Statement */}
      <div className="mt-3 pt-3 border-t border-slate-800 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 text-xs font-semibold text-slate-200">
        <span className="text-emerald-400 font-bold mr-1.5">💡</span>
        <span>{trendStatement}</span>
      </div>
    </div>
  );
}
