import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from './Icons';

export default function StatCard({
  title,
  value,
  unit = '',
  subtitle = '',
  trend = null,
  trendType = 'up',
  icon: Icon,
  color = 'emerald',
  highlight = false,
}) {
  const colorMap = {
    emerald: {
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    gold: {
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    blue: {
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      border: 'rgba(2, 132, 199, 0.25)',
    },
    purple: {
      iconBg: '#f3e8ff',
      iconColor: '#7c3aed',
      border: 'rgba(124, 58, 237, 0.25)',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div
      className={`stat-card card ${highlight ? 'stat-card-highlight' : ''}`}
      style={{ borderColor: highlight ? scheme.iconColor : undefined }}
    >
      <div className="stat-card-header">
        <div className="stat-card-info">
          <span className="stat-card-title">{title}</span>
          <div className="stat-card-value-wrap">
            <span className="stat-card-value">{value}</span>
            {unit && <span className="stat-card-unit">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div
            className="stat-card-icon"
            style={{ backgroundColor: scheme.iconBg, color: scheme.iconColor }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>

      <div className="stat-card-footer">
        {trend && (
          <span
            className={`stat-trend ${
              trendType === 'up'
                ? 'trend-up'
                : trendType === 'down'
                ? 'trend-down'
                : 'trend-neutral'
            }`}
          >
            {trendType === 'up' ? (
              <TrendingUpIcon size={14} />
            ) : trendType === 'down' ? (
              <TrendingDownIcon size={14} />
            ) : null}
            {trend}
          </span>
        )}
        {subtitle && <span className="stat-card-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
