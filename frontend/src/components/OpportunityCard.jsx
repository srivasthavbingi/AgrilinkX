import React from 'react';

/**
 * OpportunityCard — shows a market opportunity for a specific product.
 * Only rendered when actual data justifies the opportunity.
 *
 * Props come from price-intelligence + demand-intelligence combined data.
 */
export default function OpportunityCard({ item, demandItem }) {
  const {
    product,
    unit = 'kg',
    your_price,
    platform_avg,
    suggested_price,
    demand_level,
    your_qty,
  } = item;

  const platform_qty = demandItem?.platform_ordered_qty ?? 0;
  const hasOpportunity = platform_avg && your_price < platform_avg * 0.97;

  // Determine opportunity strength
  let opportunityLevel = 'Moderate';
  let opportunityColor = '#d97706';
  let action = 'Review your current price against the platform average.';

  if (demand_level === 'HIGH' && hasOpportunity) {
    opportunityLevel = 'High';
    opportunityColor = '#059669';
    action = 'High buyer demand detected. Consider revising your price upward.';
  } else if (demand_level === 'LOW' || demand_level === 'NONE') {
    opportunityLevel = 'Low';
    opportunityColor = '#64748b';
    action = 'Demand is currently low. Competitive pricing may attract more buyers.';
  } else if (!hasOpportunity && demand_level === 'HIGH') {
    opportunityLevel = 'Good';
    opportunityColor = '#0284c7';
    action = 'Your price is competitive and demand is high. Consider increasing listing quantity.';
  }

  const EMOJI_MAP = {
    Tomato: '🍅', Onion: '🧅', Potato: '🥔', Spinach: '🥬',
    Chilli: '🌶️', Rice: '🌾', Milk: '🥛', Tea: '🍵',
    'Toor Dal': '🫘', Wheat: '🌾', Garlic: '🧄', Ginger: '🫚',
  };
  const emoji = EMOJI_MAP[product] || '🌿';

  return (
    <div className="opp-card card" style={{ '--opp-color': opportunityColor }}>
      <div className="opp-header">
        <span className="opp-emoji">{emoji}</span>
        <div className="opp-title-group">
          <h4 className="opp-product">{product}</h4>
          <span className="opp-level-badge" style={{ background: opportunityColor + '22', color: opportunityColor }}>
            {opportunityLevel} Opportunity
          </span>
        </div>
      </div>

      <div className="opp-stats-grid">
        <div className="opp-stat">
          <span className="opp-stat-label">Your Price</span>
          <span className="opp-stat-value">₹{your_price}/{unit}</span>
        </div>
        {platform_avg && (
          <div className="opp-stat">
            <span className="opp-stat-label">Platform Avg</span>
            <span className="opp-stat-value">₹{platform_avg}/{unit}</span>
          </div>
        )}
        <div className="opp-stat">
          <span className="opp-stat-label">Your Inventory</span>
          <span className="opp-stat-value">{your_qty} {unit}</span>
        </div>
        {platform_qty > 0 && (
          <div className="opp-stat">
            <span className="opp-stat-label">Platform Orders</span>
            <span className="opp-stat-value">{platform_qty} {unit}</span>
          </div>
        )}
        {suggested_price && (
          <div className="opp-stat opp-stat-suggested">
            <span className="opp-stat-label">Suggested Price</span>
            <span className="opp-stat-value opp-suggested-val">₹{suggested_price}/{unit}</span>
          </div>
        )}
      </div>

      <div className="opp-action">
        <span className="opp-action-icon">💡</span>
        <p className="opp-action-text">{action}</p>
      </div>
    </div>
  );
}
