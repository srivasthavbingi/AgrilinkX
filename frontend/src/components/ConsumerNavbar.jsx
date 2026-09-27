import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  SproutIcon,
  MapPinIcon,
  SearchIcon,
  ShoppingCartIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from './Icons';
import { locationPresets, locationService } from '../services/locationService';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

export default function ConsumerNavbar({ onSearchSubmit, initialSearch = '' }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedLocation, setSelectedLocation] = useState(locationService.getCurrentLocation());
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const ordersCount = orderService.getOrders().length;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchQuery);
      } else {
        navigate(`/recommendations?query=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  const handleSelectLocation = (loc) => {
    locationService.setCurrentLocation(loc);
    setSelectedLocation(loc);
    setShowLocationMenu(false);
  };

  return (
    <header className="consumer-navbar">
      <div className="consumer-navbar-inner">
        {/* Brand */}
        <div className="consumer-brand-group">
          <Link to="/" className="consumer-brand-link">
            <div className="brand-logo-icon consumer-logo">
              <SproutIcon size={22} color="#ffffff" />
            </div>
            <div className="consumer-brand-title">
              <span>AgriLink</span>
              <span className="text-emerald">X</span>
              <span className="consumer-tag">Family Store</span>
            </div>
          </Link>

          {/* Location Selector */}
          <div className="consumer-location-wrapper" style={{ position: 'relative' }}>
            <button
              type="button"
              className="location-pill-btn"
              onClick={() => setShowLocationMenu(!showLocationMenu)}
            >
              <MapPinIcon size={15} color="#059669" />
              <span className="location-name">{selectedLocation.area || selectedLocation.label.split(',')[0]}</span>
              <span className="chevron-icon">▾</span>
            </button>

            {showLocationMenu && (
              <div className="location-dropdown card">
                <div className="loc-dropdown-title">Choose Your Delivery Location</div>
                {locationPresets.map((loc) => (
                  <div
                    key={loc.id}
                    className={`loc-item ${loc.id === selectedLocation.id ? 'active' : ''}`}
                    onClick={() => handleSelectLocation(loc)}
                  >
                    <MapPinIcon size={14} color={loc.id === selectedLocation.id ? '#059669' : '#94a3b8'} />
                    <div>
                      <strong>{loc.label.split(',')[0]}</strong>
                      <span>{loc.area}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search in Nav */}
        <form onSubmit={handleSearch} className="consumer-nav-search">
          <SearchIcon size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search fresh tomatoes, Assam tea, milk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-mini-submit">
            Search
          </button>
        </form>

        {/* Right Actions */}
        <div className="consumer-nav-actions">
          {/* Orders Link */}
          {user && profile?.role === 'family' && (
            <button
              type="button"
              className="nav-orders-btn"
              onClick={() => navigate('/orders')}
            >
              <ShoppingCartIcon size={18} color="#334155" />
              <span className="orders-lbl">My Orders</span>
              {ordersCount > 0 && <span className="badge-count">{ordersCount}</span>}
            </button>
          )}

          {user ? (
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <span style={{fontWeight:'500', color:'#334155'}}>{profile?.full_name || 'User'}</span>
              <button className="btn btn-outline btn-sm" onClick={signOut}>Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
