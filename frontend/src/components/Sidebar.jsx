import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  SproutIcon,
  BarChart3Icon,
  PackageIcon,
  LayersIcon,
  ScaleIcon,
  TrendingUpIcon,
  UsersIcon,
  SparklesIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  WarehouseIcon,
  MapPinIcon,
} from './Icons';
import { currentFarmer } from '../data/mockData';

export default function Sidebar() {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: BarChart3Icon },
    { label: 'Market Intelligence', path: '/market-intelligence', icon: TrendingUpIcon, badge: 'NEW' },
    { label: 'My Inventory', path: '/inventory', icon: PackageIcon, badge: 'New' },
    { label: 'Farmer Orders', path: '/farmer/orders', icon: ShoppingCartIcon, badge: 'Orders' },
    { label: 'My Crop Lots', path: '/crop-lot', icon: LayersIcon, badge: '3 Lots' },
    { label: 'Markets & Storage', path: '/storage', icon: WarehouseIcon, badge: 'Map' },
    { label: 'Mandi Comparison', path: '/markets', icon: ScaleIcon, badge: 'Live' },
    { label: 'Price Prediction', path: '/price-prediction', icon: TrendingUpIcon, ai: true },
    { label: 'Verified Buyers', path: '/buyers', icon: UsersIcon, badge: '4 Hubs' },
    { label: 'AI Recommendation', path: '/recommendation', icon: SparklesIcon, ai: true },
    { label: 'Transactions', path: '/transaction', icon: ShoppingCartIcon, badge: '1 Active' },
    { label: 'Family Store', path: '/', icon: SproutIcon, badge: 'Family' },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo-icon">
          <SproutIcon size={24} color="#ffffff" />
        </div>
        <div className="brand-text">
          <div className="brand-name">
            AgriLink<span>X</span>
          </div>
          <span className="brand-badge">SIH 2026</span>
        </div>
      </div>

      {/* Mode Switcher Pill */}
      <div className="sidebar-mode-switch">
        <button
          type="button"
          className="btn-family-mode-switch"
          onClick={() => navigate('/')}
        >
          <span>🛒 Family Store Mode</span>
          <span className="switch-arrow">➔</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="nav-group-title">FARMER INTELLIGENCE</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-link-icon">
                <Icon size={18} />
              </span>
              <span className="nav-link-text">{item.label}</span>
              {item.ai && <span className="nav-pill-ai">AI</span>}
              {item.badge && !item.ai && <span className="nav-pill">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Verified Farmer Card at Bottom */}
      <div className="sidebar-footer">
        <div className="farmer-profile-card">
          <div className="farmer-avatar-wrap">
            <div className="farmer-avatar">RR</div>
            <span className="online-indicator"></span>
          </div>
          <div className="farmer-info">
            <div className="farmer-name">
              {currentFarmer.name}
              <CheckCircleIcon size={14} color="#10b981" />
            </div>
            <div className="farmer-location">
              <MapPinIcon size={12} color="#94a3b8" />
              {currentFarmer.village}, {currentFarmer.district}
            </div>
          </div>
        </div>
        <button
          className="btn-sidebar-logout"
          onClick={() => navigate('/login')}
          title="Sign in with different account"
        >
          Switch Account / Log out
        </button>
      </div>
    </aside>
  );
}
