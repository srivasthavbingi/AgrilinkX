import React from 'react';

/**
 * DemandBadge — pill displaying demand classification level.
 * Sizes: 'sm' | 'md' (default)
 */
export default function DemandBadge({ level, size = 'md' }) {
  const cfg = {
    HIGH:   { emoji: '🔥', label: 'HIGH',   cls: 'demand-high'   },
    MEDIUM: { emoji: '📊', label: 'MEDIUM', cls: 'demand-medium' },
    LOW:    { emoji: '📉', label: 'LOW',    cls: 'demand-low'    },
    NONE:   { emoji: '—',  label: 'No data', cls: 'demand-none'  },
  }[level] || { emoji: '—', label: 'No data', cls: 'demand-none' };

  return (
    <span className={`demand-badge ${cfg.cls} demand-badge-${size}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}
