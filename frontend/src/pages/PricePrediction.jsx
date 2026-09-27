import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PriceChart from '../components/PriceChart';
import {
  BrainIcon,
  SparklesIcon,
  TrendingUpIcon,
  ActivityIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  InfoIcon,
} from '../components/Icons';
import {
  priceTrendData,
  marketDrivers,
  activeCropLot,
} from '../data/mockData';

export default function PricePrediction() {
  const navigate = useNavigate();
  const [horizon, setHorizon] = useState('7D'); // '7D', '15D'

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Price Prediction & Horizon Forecasting</h1>
          <p className="page-subtitle">
            Ensemble machine learning model trained on 10-year AGMARKNET historical arrivals, weather data, and seasonal mandi trends.
          </p>
        </div>
      </div>

      {/* AI Intelligence Summary Strip */}
      <div className="ai-summary-banner card">
        <div className="ai-summary-left">
          <div className="ai-brain-badge">
            <BrainIcon size={24} color="#ffffff" />
          </div>
          <div className="ai-summary-texts">
            <div className="ai-tag-row">
              <span className="badge badge-emerald">
                <SparklesIcon size={12} /> ML Model Confidence: 87%
              </span>
              <span className="badge badge-gold">Recommendation: Sell in 48-72 Hours</span>
            </div>
            <h2 className="ai-headline">
              Tomato prices projected to peak at ₹33.00/kg around Sep 16
            </h2>
            <p className="ai-desc">
              Arrivals across Telangana & Karnataka APMCs are running 18% below average. A 3-day supply gap is creating an optimal selling window before fresh Maharashtra harvests arrive next week.
            </p>
          </div>
        </div>

        <div className="ai-summary-metrics">
          <div className="metric-cell">
            <span className="lbl">Current Modal</span>
            <strong className="val">₹31.00/kg</strong>
          </div>
          <div className="metric-cell">
            <span className="lbl">Forecasted Peak</span>
            <strong className="val text-emerald">₹33.00/kg</strong>
          </div>
          <div className="metric-cell">
            <span className="lbl">Optimal Window</span>
            <strong className="val text-gold">Sep 14 - Sep 16</strong>
          </div>
        </div>
      </div>

      {/* Recharts Price Prediction Visualization */}
      <div className="section-block">
        <PriceChart
          data={priceTrendData}
          cropName={activeCropLot.cropName}
        />
      </div>

      {/* Market Drivers & Impact Breakdown */}
      <div className="section-block">
        <h3 className="section-title">Key AI Market Drivers & Supply Factors</h3>
        <p className="section-sub">Real-time variables influencing price movements for this crop lot</p>

        <div className="drivers-grid">
          {marketDrivers.map((driver, idx) => (
            <div key={idx} className="driver-card card">
              <div className="driver-card-top">
                <h4 className="driver-title">{driver.title}</h4>
                <span
                  className={`badge ${
                    driver.type === 'positive'
                      ? 'badge-emerald'
                      : driver.type === 'negative'
                      ? 'badge-rose'
                      : 'badge-gold'
                  }`}
                >
                  {driver.impact}
                </span>
              </div>
              <p className="driver-desc">{driver.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to action */}
      <div className="prediction-cta card">
        <div className="cta-content">
          <h3>Ready to capitalize on the price peak?</h3>
          <p>
            Lock in a guaranteed transaction with a verified institutional buyer or reserve mandi transport for Bowenpally now.
          </p>
        </div>
        <div className="cta-buttons">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/buyers')}
          >
            <span>Lock In Buyer Price</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/recommendation')}
          >
            <span>Proceed with AI Strategy</span>
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
