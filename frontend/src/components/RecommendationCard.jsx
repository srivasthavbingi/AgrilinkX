import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  CheckCircleIcon,
  TruckIcon,
  TrendingUpIcon,
  ArrowRightIcon,
  ScaleIcon,
} from './Icons';

export default function RecommendationCard({
  recommendation,
  cropName = 'Tomato',
  quantityKg = 1000,
}) {
  const navigate = useNavigate();

  return (
    <div className="recommendation-card-widget">
      {/* Top Header Badge */}
      <div className="rec-header">
        <div className="rec-pill">
          <SparklesIcon size={14} color="#059669" />
          <span>{recommendation.title || 'Best Selling Option'}</span>
        </div>
        <div className="rec-confidence">
          <div className="confidence-pill">
            <span className="confidence-dot"></span>
            <strong>AI Confidence: {recommendation.aiConfidence}%</strong>
          </div>
        </div>
      </div>

      {/* Main highlight content */}
      <div className="rec-main-body">
        <div className="rec-destination">
          <div className="rec-destination-title-wrap">
            <h3 className="rec-market-name">{recommendation.marketName}</h3>
            <span className="rec-crop-tag">
              {cropName} ({quantityKg} kg lot)
            </span>
          </div>
          <p className="rec-summary-text">{recommendation.reasoning}</p>
        </div>

        {/* 4 Metric Callout Pills */}
        <div className="rec-metrics-grid">
          <div className="rec-metric-box highlight-revenue">
            <span className="rec-metric-label">Expected Net Realization</span>
            <div className="rec-metric-val">
              ₹{recommendation.expectedRealization.toLocaleString()}
            </div>
            <span className="rec-metric-sub">
              (₹{(recommendation.expectedRealization / quantityKg).toFixed(1)}/kg net in hand)
            </span>
          </div>

          <div className="rec-metric-box">
            <span className="rec-metric-label">Predicted Mandi Price</span>
            <div className="rec-metric-val text-emerald">
              ₹{recommendation.predictedPrice}
              <span className="unit-small">/kg</span>
            </div>
            <span className="rec-metric-sub">
              <TrendingUpIcon size={12} color="#059669" />
              Peak price window
            </span>
          </div>

          <div className="rec-metric-box">
            <span className="rec-metric-label">Estimated Transport</span>
            <div className="rec-metric-val text-slate">
              ₹{recommendation.estimatedTransport.toLocaleString()}
            </div>
            <span className="rec-metric-sub">
              <TruckIcon size={12} color="#64748b" />
              32 km Tata Ace load
            </span>
          </div>

          <div className="rec-metric-box">
            <span className="rec-metric-label">Demand Index</span>
            <div className="rec-metric-val text-emerald">
              {recommendation.demand}
            </div>
            <span className="rec-metric-sub">
              <CheckCircleIcon size={12} color="#059669" />
              185 tons daily clearance
            </span>
          </div>
        </div>
      </div>

      {/* Action Strip */}
      <div className="rec-action-strip">
        <div className="rec-window-info">
          <span className="window-clock">⚡</span>
          <span>Optimal Selling Window: <strong>{recommendation.windowHours || 'Next 24 - 36 Hours'}</strong></span>
        </div>
        <div className="rec-button-group">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/markets')}
          >
            <ScaleIcon size={15} />
            <span>Compare Others</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/recommendation')}
          >
            <span>View Full Decision Matrix</span>
            <ArrowRightIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
