import React, { useState } from 'react';
import {
  BellIcon,
  SearchIcon,
  MapPinIcon,
  ActivityIcon,
  CheckCircleIcon,
  SparklesIcon,
  TrendingUpIcon,
} from './Icons';
import { currentFarmer } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { profile, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');

  const alerts = [
    {
      id: 1,
      title: 'Tomato Surge in Bowenpally',
      time: '12m ago',
      desc: 'Market price jumped to ₹31/kg (+6.8%) due to lower arrivals.',
      icon: TrendingUpIcon,
      color: '#10b981',
    },
    {
      id: 2,
      title: 'Buyer Quote Received',
      time: '35m ago',
      desc: 'Reliance Fresh Hub offered ₹30/kg with instant escrow.',
      icon: SparklesIcon,
      color: '#0284c7',
    },
  ];

  return (
    <header className="topbar">
      {/* Location / Mandi Selector */}
      <div className="topbar-location">
        <div className="location-chip">
          <MapPinIcon size={16} color="#059669" />
          <span className="location-label">Active Mandi Catchment:</span>
          <strong className="location-value">Rangareddy & Hyderabad Hubs</strong>
        </div>
        <div className="live-sync-indicator">
          <span className="sync-pulse"></span>
          <span>e-NAM & AGMARKNET Live (11:30 AM)</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="topbar-actions">
        {/* Search */}
        <div className="search-box">
          <SearchIcon size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search crops, mandis, buyers..."
            aria-label="Search"
          />
        </div>

        {/* Language Selector */}
        <div className="lang-switcher">
          {['EN', 'తె', 'हि'].map((lang) => (
            <button
              key={lang}
              type="button"
              className={`lang-btn ${selectedLanguage === lang ? 'active' : ''}`}
              onClick={() => setSelectedLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <div className="notifications-wrapper" style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-icon notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <BellIcon size={19} color="#334155" />
            <span className="notification-badge">2</span>
          </button>

          {showNotifications && (
            <div className="notifications-dropdown card">
              <div className="dropdown-header">
                <h4>Market Alerts</h4>
                <span className="badge badge-emerald">2 New</span>
              </div>
              <div className="dropdown-list">
                {alerts.map((alert) => {
                  const Icon = alert.icon;
                  return (
                    <div key={alert.id} className="notification-item">
                      <div className="notif-icon" style={{ color: alert.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">
                          {alert.title}
                          <span className="notif-time">{alert.time}</span>
                        </div>
                        <p className="notif-desc">{alert.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="dropdown-footer">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setShowNotifications(false)}
                >
                  Dismiss all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Farmer Chip */}
        <div className="topbar-user" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="user-text">
            <span className="user-name">{profile?.full_name || 'Farmer'}</span>
            <span className="user-role">Verified Farmer</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={signOut}>Logout</button>
        </div>
      </div>
    </header>
  );
}
