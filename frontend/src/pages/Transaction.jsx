import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShoppingCartIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  TruckIcon,
  FileTextIcon,
  SparklesIcon,
  DownloadIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
} from '../components/Icons';
import {
  activeTransactionsData,
  currentFarmer,
  activeCropLot,
} from '../data/mockData';

export default function Transaction() {
  const location = useLocation();
  const buyerPassed = location.state?.buyer;
  const [activeTxn, setActiveTxn] = useState(activeTransactionsData[0]);

  const stages = [
    { title: 'Deal Agreed', desc: 'Price locked & Escrow funded' },
    { title: 'Logistics Booked', desc: 'Mini-truck assigned' },
    { title: 'Quality Passed', desc: 'Grade A verified at farm' },
    { title: 'Dispatched', desc: 'En-route to buyer hub' },
    { title: 'Escrow Released', desc: 'Direct UPI bank transfer' },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Enablement & Escrow Tracker</h1>
          <p className="page-subtitle">
            Track end-to-end deal execution from quality grading and truck dispatch to automated escrow settlement.
          </p>
        </div>
        <div className="header-escrow-badge">
          <ShieldCheckIcon size={20} color="#059669" />
          <span>Secured by AgriLinkX Digital Escrow</span>
        </div>
      </div>

      {/* Primary Active Deal Tracker */}
      <div className="section-block">
        <div className="active-deal-card card">
          <div className="deal-card-header">
            <div className="deal-header-left">
              <span className="badge badge-emerald">Active Transaction</span>
              <h2 className="deal-id">{activeTxn.id}</h2>
              <span className="deal-crop">
                {activeTxn.crop} • {activeTxn.quantity}
              </span>
            </div>
            <div className="deal-header-right">
              <span className="escrow-secured-label">Escrow Deposited</span>
              <strong className="escrow-amount">{activeTxn.totalAmount}</strong>
              <span className="escrow-status-sub">Funds guaranteed in bank</span>
            </div>
          </div>

          {/* 5-Step Visual Milestone Progress Bar */}
          <div className="milestone-tracker">
            {stages.map((stg, idx) => {
              const isPassed = idx <= activeTxn.stageIndex;
              const isCurrent = idx === activeTxn.stageIndex;

              return (
                <div
                  key={idx}
                  className={`milestone-step ${isPassed ? 'completed' : ''} ${
                    isCurrent ? 'current' : ''
                  }`}
                >
                  <div className="milestone-marker">
                    {isPassed ? (
                      <CheckCircleIcon size={16} color="#ffffff" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <div className="milestone-label-box">
                    <strong className="milestone-name">{stg.title}</strong>
                    <span className="milestone-desc">{stg.desc}</span>
                  </div>
                  {idx < stages.length - 1 && <div className="milestone-line"></div>}
                </div>
              );
            })}
          </div>

          {/* Deal Metadata Details Grid */}
          <div className="deal-metadata-grid">
            <div className="meta-card">
              <span className="meta-lbl">Contracted Buyer</span>
              <strong>{activeTxn.buyer}</strong>
              <span className="sub-tag">Verified Corporate Partner</span>
            </div>
            <div className="meta-card">
              <span className="meta-lbl">Agreed Rate</span>
              <strong className="text-emerald">{activeTxn.agreedRate}</strong>
              <span className="sub-tag">Zero Middleman Commission</span>
            </div>
            <div className="meta-card">
              <span className="meta-lbl">Logistics Partner</span>
              <strong>{activeTxn.logisticsPartner}</strong>
              <span className="sub-tag">Tracking ID: {activeTxn.trackingId}</span>
            </div>
            <div className="meta-card">
              <span className="meta-lbl">Expected Payout</span>
              <strong className="text-emerald">{activeTxn.totalAmount}</strong>
              <span className="sub-tag">{activeTxn.estimatedSettlementDate}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="deal-card-footer">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => alert(`Tracking dispatch with ID: ${activeTxn.trackingId}`)}
            >
              <TruckIcon size={15} />
              <span>Track Dispatch Live</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => alert('Digital Escrow Contract receipt generated successfully!')}
            >
              <FileTextIcon size={15} />
              <span>Download Digital Receipt (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Transactions */}
      <div className="section-block">
        <h3 className="section-title">Past Completed Transactions</h3>
        <div className="table-responsive card">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Crop & Quantity</th>
                <th>Buyer / Partner</th>
                <th>Agreed Rate</th>
                <th>Net Payout</th>
                <th>Settlement Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeTransactionsData.map((txn) => (
                <tr key={txn.id}>
                  <td>
                    <strong>{txn.id}</strong>
                  </td>
                  <td>
                    {txn.crop} ({txn.quantity})
                  </td>
                  <td>{txn.buyer}</td>
                  <td>{txn.agreedRate}</td>
                  <td>
                    <strong className="text-emerald">{txn.totalAmount}</strong>
                  </td>
                  <td>{txn.estimatedSettlementDate}</td>
                  <td>
                    <span
                      className={`badge ${
                        txn.stageIndex === 4 ? 'badge-emerald' : 'badge-blue'
                      }`}
                    >
                      {txn.currentStage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
