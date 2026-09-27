import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { SparklesIcon, TrendingUpIcon } from './Icons';

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-date">{label}</p>
        {dataPoint.actual !== null && dataPoint.actual !== undefined && (
          <p className="tooltip-item actual">
            <span className="dot dot-actual"></span>
            Actual Market Price: <strong>₹{dataPoint.actual}/kg</strong>
          </p>
        )}
        {dataPoint.predicted !== null && dataPoint.predicted !== undefined && (
          <p className="tooltip-item predicted">
            <span className="dot dot-predicted"></span>
            AI Forecasted: <strong>₹{dataPoint.predicted}/kg</strong>
          </p>
        )}
        {dataPoint.lower !== null && dataPoint.upper !== null && (
          <p className="tooltip-bounds">
            Confidence Range: ₹{dataPoint.lower} - ₹{dataPoint.upper}
          </p>
        )}
        {dataPoint.volume && (
          <p className="tooltip-volume">Mandi Arrival: {dataPoint.volume} Tons</p>
        )}
      </div>
    );
  }
  return null;
};

export default function PriceChart({
  data,
  cropName = 'Tomato',
  compact = false,
}) {
  const [activeTab, setActiveTab] = useState('both'); // 'actual', 'predicted', 'both'

  return (
    <div className={`price-chart-container card ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-title-row">
            <h3 className="chart-title">{cropName} Price Trend & 7-Day AI Forecast</h3>
            <span className="badge badge-emerald">
              <TrendingUpIcon size={13} />
              +6.8% Upward Momentum
            </span>
          </div>
          <p className="chart-subtitle">
            Historical mandi modal rates & Machine Learning confidence interval (Bowenpally benchmark)
          </p>
        </div>

        {/* View filters */}
        <div className="chart-controls">
          <div className="pill-toggle">
            <button
              type="button"
              className={`pill-btn ${activeTab === 'both' ? 'active' : ''}`}
              onClick={() => setActiveTab('both')}
            >
              All Data
            </button>
            <button
              type="button"
              className={`pill-btn ${activeTab === 'predicted' ? 'active' : ''}`}
              onClick={() => setActiveTab('predicted')}
            >
              Forecast Only
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-body" style={{ width: '100%', height: compact ? 260 : 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
            <defs>
              {/* Actual price green gradient */}
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>

              {/* Confidence interval band */}
              <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              domain={[20, 38]}
              tickFormatter={(v) => `₹${v}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Upper confidence band */}
            {(activeTab === 'both' || activeTab === 'predicted') && (
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="url(#colorBand)"
                name="Confidence Range"
              />
            )}

            {/* Actual Historical Trend */}
            {(activeTab === 'both' || activeTab === 'actual') && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#059669"
                strokeWidth={3}
                fill="url(#colorActual)"
                name="Actual Price"
                dot={{ r: 4, fill: '#059669', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#047857' }}
              />
            )}

            {/* AI Predicted Line */}
            {(activeTab === 'both' || activeTab === 'predicted') && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#d97706"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="AI Prediction"
                dot={{ r: 4, fill: '#d97706', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#b45309' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and insight row */}
      <div className="chart-footer-legend">
        <div className="legend-item">
          <span className="legend-indicator bg-emerald"></span>
          <span>Actual Market Price (Past 14 Days)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator bg-dashed-amber"></span>
          <span>AI Forecast Line (Next 7 Days)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator bg-amber-shade"></span>
          <span>Confidence Interval corridor (87% confidence)</span>
        </div>
      </div>
    </div>
  );
}
