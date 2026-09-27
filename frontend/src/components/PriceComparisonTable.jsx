import React from 'react';
import DemandBadge from './DemandBadge';

/**
 * PriceComparisonTable — responsive table showing:
 * Product | Your Price | Platform Avg | Min | Max | Demand | Suggested
 *
 * Props:
 *   items: array from /api/farmer/price-intelligence
 */
export default function PriceComparisonTable({ items = [] }) {
  if (!items.length) {
    return (
      <div className="pct-empty">
        <span className="pct-empty-icon">📋</span>
        <p>No price comparison data yet.</p>
        <p className="pct-empty-sub">Add more listings to see platform price intelligence.</p>
      </div>
    );
  }

  return (
    <div className="pct-wrapper">
      <div className="pct-scroll">
        <table className="pct-table">
          <thead>
            <tr>
              <th className="pct-th">Product</th>
              <th className="pct-th pct-th-num">Your Price</th>
              <th className="pct-th pct-th-num">Platform Avg</th>
              <th className="pct-th pct-th-num">Govt Mandi</th>
              <th className="pct-th pct-th-num">Min</th>
              <th className="pct-th pct-th-num">Max</th>
              <th className="pct-th">Demand</th>
              <th className="pct-th pct-th-num">Suggested</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => {
              const hasComparison = row.platform_avg !== null && row.platform_avg !== undefined;
              const diffFromAvg = hasComparison ? row.your_price - row.platform_avg : null;
              const rowCls = diffFromAvg !== null
                ? diffFromAvg < -1 ? 'pct-row-below'
                : diffFromAvg > 1 ? 'pct-row-above'
                : ''
                : '';

              const govPrice = row.gov_mandi_price !== undefined ? row.gov_mandi_price : null;

              return (
                <tr key={i} className={`pct-row ${rowCls}`}>
                  <td className="pct-td pct-product">
                    <span className="pct-product-name">{row.product}</span>
                    <span className="pct-unit">{row.unit}</span>
                  </td>
                  <td className="pct-td pct-td-num">
                    <span className="pct-your-price">₹{row.your_price}</span>
                  </td>
                  <td className="pct-td pct-td-num">
                    {hasComparison ? (
                      <span>₹{row.platform_avg}</span>
                    ) : (
                      <span className="pct-na">—</span>
                    )}
                  </td>
                  <td className="pct-td pct-td-num">
                    {govPrice !== null && govPrice !== undefined ? (
                      <span className="pct-gov-price" style={{ fontWeight: 600, color: '#8b5cf6' }}>₹{govPrice}</span>
                    ) : (
                      <span className="pct-na">—</span>
                    )}
                  </td>
                  <td className="pct-td pct-td-num">
                    {hasComparison ? `₹${row.platform_min}` : <span className="pct-na">—</span>}
                  </td>
                  <td className="pct-td pct-td-num">
                    {hasComparison ? `₹${row.platform_max}` : <span className="pct-na">—</span>}
                  </td>
                  <td className="pct-td">
                    <DemandBadge level={row.demand_level} size="sm" />
                  </td>
                  <td className="pct-td pct-td-num">
                    {row.suggested_price !== null && row.suggested_price !== undefined ? (
                      <span className="pct-suggested">₹{row.suggested_price}</span>
                    ) : (
                      <span className="pct-na">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>
      <p className="pct-footnote">
        Platform prices are calculated from AgriLinkX listings. Suggested price is algorithmic, not financial advice.
      </p>
    </div>
  );
}
