import React, { useState, useMemo } from 'react';
import {
  SparklesIcon,
  TrendingUpIcon,
  WarehouseIcon,
  SnowflakeIcon,
  DollarSignIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  ClockIcon,
} from './Icons';
import { storageService } from '../services/storageService';
import { activeCropLot, marketsData } from '../data/mockData';
import { storageFacilities } from '../data/storageData';

export default function StoreSellDecision({
  cropLot = activeCropLot,
  selectedStorage = storageFacilities[1], // GMR Aero Agro Cold Chain Hub
  targetMandi = marketsData[0], // Bowenpally Market
  onExecuteDecision,
}) {
  const [holdingDays, setHoldingDays] = useState(5);
  const [predictedPrice, setPredictedPrice] = useState(33.0); // Predicted peak in 5 days
  const [currentPrice, setCurrentPrice] = useState(31.0); // Today's market price

  // Compute decision dynamically
  const decision = useMemo(() => {
    return storageService.computeStoreVsSellDecision({
      cropLot,
      selectedStorage,
      targetMandi,
      durationDays: holdingDays,
      predictedPricePerKg: predictedPrice,
      currentPricePerKg: currentPrice,
    });
  }, [cropLot, selectedStorage, targetMandi, holdingDays, predictedPrice, currentPrice]);

  const isStore = decision.verdict === 'STORE & SELL LATER';

  return (
    <div className="store-sell-decision-card card">
      {/* Central Question Header */}
      <div className="decision-header-block">
        <div className="decision-ai-pill">
          <SparklesIcon size={15} color="#059669" />
          <span>AI MARKET TIMING ADVISORY</span>
        </div>
        <h2 className="decision-main-question">
          Should I sell my crop now or store it and sell later?
        </h2>
        <p className="decision-subtext">
          Evaluating real-time price trends, cold storage holding rates, and logistics costs for{' '}
          <strong>{cropLot.cropName} ({cropLot.quantityKg} kg)</strong>.
        </p>
      </div>

      {/* AI Verdict Banner */}
      <div className={`verdict-banner ${isStore ? 'verdict-store' : 'verdict-sell'}`}>
        <div className="verdict-left">
          <span className="verdict-label">AI RECOMMENDED STRATEGY:</span>
          <h3 className="verdict-title">{decision.verdict}</h3>
          <p className="verdict-benefit">
            {isStore ? (
              <>
                Expected Additional Net Gain: <strong className="text-emerald">+₹{decision.expectedAdditionalBenefit.toLocaleString()}</strong> by storing at {decision.storeLater.facilityName}.
              </>
            ) : (
              <>
                Sell today at {targetMandi.name} to maximize return and avoid storage overhead.
              </>
            )}
          </p>
        </div>

        <div className="verdict-meta">
          <div className="verdict-stat-pill">
            <span className="lbl">Recommended Duration</span>
            <strong>{decision.recommendedDurationDays} Days</strong>
          </div>
          <div className="verdict-stat-pill">
            <span className="lbl">AI Confidence</span>
            <strong className="text-emerald">{decision.aiConfidence}%</strong>
          </div>
        </div>
      </div>

      {/* Holding Duration Simulator */}
      <div className="duration-simulator-bar">
        <div className="slider-label-group">
          <ClockIcon size={16} color="#059669" />
          <span>Storage Holding Period: <strong>{holdingDays} Days</strong></span>
          <span className="sub-hint">(Simulate holding from 1 to 14 days)</span>
        </div>
        <input
          type="range"
          min="1"
          max="14"
          value={holdingDays}
          onChange={(e) => setHoldingDays(Number(e.target.value))}
          className="slider-input slider-large"
        />
      </div>

      {/* Side-by-Side Comparison Columns */}
      <div className="comparison-columns-grid">
        {/* Column 1: SELL NOW */}
        <div className={`decision-col ${!isStore ? 'active-col' : ''}`}>
          <div className="col-header">
            <span className="badge badge-gold">Immediate Sale</span>
            <h4>SELL NOW (Today)</h4>
            <span className="col-sub">Direct delivery to {targetMandi.name}</span>
          </div>

          <div className="calc-breakdown-list">
            <div className="calc-item">
              <span className="lbl">Current Market Price:</span>
              <strong>₹{decision.currentPricePerKg}/kg</strong>
            </div>
            <div className="calc-item">
              <span className="lbl">Gross Crop Value ({decision.quantityKg} kg):</span>
              <strong>₹{decision.sellNow.grossRevenue.toLocaleString()}</strong>
            </div>
            <div className="calc-item expense">
              <span className="lbl">Transport Cost to Mandi ({targetMandi.distance} km):</span>
              <span>- ₹{decision.sellNow.transportCost.toLocaleString()}</span>
            </div>
            <div className="calc-item expense">
              <span className="lbl">Storage Cost:</span>
              <span>₹0 (Zero Holding)</span>
            </div>
          </div>

          <div className="col-net-total">
            <span className="total-lbl">Expected Net Revenue</span>
            <div className="total-figure">
              <strong className="amount">₹{decision.sellNow.netRevenue.toLocaleString()}</strong>
              <span className="per-kg">₹{decision.sellNow.netPerKg}/kg net</span>
            </div>
          </div>
        </div>

        {/* Column 2: STORE & SELL LATER */}
        <div className={`decision-col ${isStore ? 'active-col highlight-emerald' : ''}`}>
          <div className="col-header">
            <span className="badge badge-blue">Optimized Holding</span>
            <h4>STORE & SELL LATER</h4>
            <span className="col-sub">Store {holdingDays} days in {selectedStorage.name}</span>
          </div>

          <div className="calc-breakdown-list">
            <div className="calc-item">
              <span className="lbl">Predicted Peak Price (Day {holdingDays}):</span>
              <strong className="text-emerald">₹{decision.predictedPricePerKg}/kg (+₹{(decision.predictedPricePerKg - decision.currentPricePerKg).toFixed(1)})</strong>
            </div>
            <div className="calc-item">
              <span className="lbl">Future Gross Revenue:</span>
              <strong>₹{decision.storeLater.grossRevenue.toLocaleString()}</strong>
            </div>
            <div className="calc-item expense">
              <span className="lbl">Storage Fee ({holdingDays}d @ ₹{decision.storeLater.storageRatePerKgPerDay}/kg/day):</span>
              <span>- ₹{decision.storeLater.storageCost.toLocaleString()}</span>
            </div>
            <div className="calc-item expense">
              <span className="lbl">Transport (Farm ➔ Storage ➔ Mandi):</span>
              <span>- ₹{decision.storeLater.transportCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="col-net-total">
            <span className="total-lbl">Expected Net Revenue</span>
            <div className="total-figure">
              <strong className="amount text-emerald">₹{decision.storeLater.netRevenue.toLocaleString()}</strong>
              <span className="per-kg">₹{decision.storeLater.netPerKg}/kg net</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Rationale Points */}
      <div className="decision-rationale-box">
        <h5>AI Key Drivers & Rationale:</h5>
        <ul className="rationale-list">
          {decision.keyFactors.map((fact, idx) => (
            <li key={idx}>
              <CheckCircleIcon size={14} color="#059669" />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Strip */}
      <div className="decision-footer-strip">
        <span className="footer-note">
          Formula: <code>sellNow = price × qty - transport</code> vs <code>storeLater = peakPrice × qty - storageCost - transport</code>
        </span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (onExecuteDecision) onExecuteDecision(decision);
            else alert(`Executing strategy: ${decision.verdict}!`);
          }}
        >
          <span>Execute {decision.verdict}</span>
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
