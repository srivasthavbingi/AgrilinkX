import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BuyerCard from '../components/BuyerCard';
import {
  UsersIcon,
  ShieldCheckIcon,
  FilterIcon,
  SearchIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '../components/Icons';
import { verifiedBuyersData, activeCropLot } from '../data/mockData';

export default function Buyers() {
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuyers = verifiedBuyersData.filter((buyer) => {
    const matchesCategory =
      filterCategory === 'all' || buyer.category.toLowerCase().includes(filterCategory.toLowerCase());
    const matchesSearch =
      buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      buyer.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      buyer.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Verified Institutional Buyers Directory</h1>
          <p className="page-subtitle">
            Bypass intermediaries and trade directly with vetted corporate buyers, e-grocery platforms, and registered APMC commission agents with 100% digital escrow security.
          </p>
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="buyers-trust-strip card">
        <div className="trust-item">
          <ShieldCheckIcon size={22} color="#059669" />
          <div className="trust-text">
            <strong>100% Escrow Protection</strong>
            <span>Payment deposited before produce leaves your farm</span>
          </div>
        </div>
        <div className="trust-item">
          <CheckCircleIcon size={22} color="#0284c7" />
          <div className="trust-text">
            <strong>Zero Mandi Commission</strong>
            <span>Save 4-6% middlemen fee with direct procurement</span>
          </div>
        </div>
        <div className="trust-item">
          <SparklesIcon size={22} color="#d97706" />
          <div className="trust-text">
            <strong>Farmgate Pickup Option</strong>
            <span>Buyer-arranged logistics available for select hubs</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mandi-toolbar card">
        <div className="search-box">
          <SearchIcon size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search buyers by name, company, or hub location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="select-input"
          >
            <option value="all">All Buyer Types</option>
            <option value="retail">Organized Retail Chains</option>
            <option value="grocery">Quick Commerce / E-Grocery</option>
            <option value="food processing">Food Processing Units</option>
            <option value="trader">Licensed Mandi Traders</option>
          </select>
        </div>
      </div>

      {/* Buyers Grid */}
      <div className="section-block">
        <div className="section-header-row">
          <h3 className="section-title">
            Available Verified Buyers ({filteredBuyers.length})
          </h3>
          <span className="badge badge-emerald">
            Active for {activeCropLot.cropName} ({activeCropLot.quantityKg} kg)
          </span>
        </div>

        <div className="buyer-cards-grid">
          {filteredBuyers.map((buyer) => (
            <BuyerCard
              key={buyer.id}
              buyer={buyer}
              onSelect={(b) => navigate('/transaction', { state: { buyer: b } })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
