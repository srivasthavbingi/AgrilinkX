import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecommendationCard from '../components/RecommendationCard';
import {
  SparklesIcon,
  CheckCircleIcon,
  TruckIcon,
  ScaleIcon,
  UsersIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  FileTextIcon,
  CalendarIcon,
} from '../components/Icons';
import {
  aiRecommendation,
  activeCropLot,
  marketsData,
  verifiedBuyersData,
} from '../data/mockData';

export default function Recommendation() {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState('mandi'); // 'mandi', 'direct', 'hold'

  const scenarios = [
    {
      id: 'mandi',
      title: 'Option 1: Bowenpally Mandi (AI Top Pick)',
      type: 'Physical APMC Mandi',
      badge: 'Best Volume Clearance',
      badgeType: 'badge-emerald',
      grossRevenue: 31000,
      transportCost: 2500,
      handlingFee: 500,
      netRealization: 28500,
      netPerKg: 28.5,
      confidence: '87%',
      timeframe: 'Next 24-36 Hours',
      pros: [
        'Highest wholesale demand in Telangana (185 tons/day)',
        'Immediate auction with 42 licensed buyers',
        'Official APMC weight slip & regulated settlement',
      ],
      cons: ['Requires 32 km transit and APMC entry queues'],
      actionText: 'Book Transport to Bowenpally',
      actionRoute: '/markets',
    },
    {
      id: 'direct',
      title: 'Option 2: Direct to Reliance Fresh Hub',
      type: 'Corporate Farmgate Buyer',
      badge: 'Highest Immediate Cash',
      badgeType: 'badge-gold',
      grossRevenue: 30000,
      transportCost: 800,
      handlingFee: 0,
      netRealization: 29200,
      netPerKg: 29.2,
      confidence: '92%',
      timeframe: 'Today, 4:00 PM',
      pros: [
        'Highest net payout (₹29,200 in hand)',
        'Buyer provides farmgate cluster pickup (₹800 fee)',
        'Zero mandi commission / zero middleman cut',
        '4-hour UPI transfer into bank account',
      ],
      cons: ['Strict Grade A quality sorting at delivery gate'],
      actionText: 'Execute Direct Buyer Deal',
      actionRoute: '/transaction',
    },
    {
      id: 'hold',
      title: 'Option 3: Hold 4 Days for Predicted Peak',
      type: 'Market Timing Strategy',
      badge: 'Speculative Upside',
      badgeType: 'badge-blue',
      grossRevenue: 33000,
      transportCost: 2500,
      handlingFee: 500,
      spoilageRisk: 990, // ~3% weight loss / moisture loss
      netRealization: 29010,
      netPerKg: 29.0,
      confidence: '68%',
      timeframe: 'Target Date: Sep 16',
      pros: ['Captures predicted price high of ₹33/kg'],
      cons: [
        '3-5% moisture/weight loss in ambient storage',
        'Higher risk if unexpected supplies arrive from Kurnool',
      ],
      actionText: 'Set Price Peak Alert',
      actionRoute: '/price-prediction',
    },
  ];

  const current = scenarios.find((s) => s.id === selectedScenario) || scenarios[0];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Selling Decision Matrix</h1>
          <p className="page-subtitle">
            Multivariate trade-off analysis evaluating Mandi auctions vs Direct institutional contracts vs Market timing for your{' '}
            <strong>{activeCropLot.cropName} ({activeCropLot.quantityKg} kg)</strong> lot.
          </p>
        </div>
      </div>

      {/* Flagship Recommendation Card */}
      <div className="section-block">
        <RecommendationCard
          recommendation={aiRecommendation}
          cropName={activeCropLot.cropName}
          quantityKg={activeCropLot.quantityKg}
        />
      </div>

      {/* 3 Selling Options Selector */}
      <div className="section-block">
        <h3 className="section-title">Comparative Selling Options</h3>
        <p className="section-sub">Choose a scenario to see the complete net realization breakdown</p>

        <div className="scenarios-selector-grid">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className={`scenario-card card ${selectedScenario === sc.id ? 'active-scenario' : ''}`}
              onClick={() => setSelectedScenario(sc.id)}
            >
              <div className="scenario-card-header">
                <span className={`badge ${sc.badgeType}`}>{sc.badge}</span>
                <span className="sc-confidence">Confidence: {sc.confidence}</span>
              </div>
              <h4 className="scenario-title">{sc.title}</h4>
              <div className="sc-net-row">
                <span className="sc-lbl">Net Realization:</span>
                <strong className="sc-val text-emerald">
                  ₹{sc.netRealization.toLocaleString()}
                </strong>
              </div>
              <span className="sc-unit-sub">(₹{sc.netPerKg}/kg net return)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Scenario Deep-Dive Breakdown */}
      <div className="section-block">
        <div className="scenario-breakdown-card card">
          <div className="breakdown-header">
            <div>
              <span className="badge badge-emerald">{current.type}</span>
              <h3 className="breakdown-title">{current.title}</h3>
              <p className="breakdown-sub">
                Target Timeline: <strong>{current.timeframe}</strong> • Model Confidence: <strong>{current.confidence}</strong>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => navigate(current.actionRoute)}
            >
              <span>{current.actionText}</span>
              <ArrowRightIcon size={16} />
            </button>
          </div>

          {/* Math Breakdown Table */}
          <div className="realization-math-box">
            <h4>Expected Realization Arithmetic:</h4>
            <div className="math-row">
              <span>Gross Produce Value ({activeCropLot.quantityKg} kg)</span>
              <strong>+ ₹{current.grossRevenue.toLocaleString()}</strong>
            </div>
            <div className="math-row negative">
              <span>Freight / Transit Costs</span>
              <span>- ₹{current.transportCost.toLocaleString()}</span>
            </div>
            {current.handlingFee > 0 && (
              <div className="math-row negative">
                <span>Mandi Cess & Porterage Handling</span>
                <span>- ₹{current.handlingFee.toLocaleString()}</span>
              </div>
            )}
            {current.spoilageRisk && (
              <div className="math-row negative">
                <span>Estimated Spoilage / Moisture Loss (4 Days Ambient)</span>
                <span>- ₹{current.spoilageRisk.toLocaleString()}</span>
              </div>
            )}
            <div className="math-row net-total">
              <span>Total Net Cash in Farmer's Bank Account</span>
              <strong className="text-emerald">₹{current.netRealization.toLocaleString()}</strong>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="pros-cons-grid">
            <div className="pros-column">
              <h5>✅ Strategic Advantages</h5>
              <ul>
                {current.pros.map((p, idx) => (
                  <li key={idx}>
                    <CheckCircleIcon size={15} color="#059669" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cons-column">
              <h5>⚠️ Trade-offs & Risks</h5>
              <ul>
                {current.cons.map((c, idx) => (
                  <li key={idx}>
                    <span className="cons-bullet">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
