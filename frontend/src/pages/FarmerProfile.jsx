import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConsumerNavbar from '../components/ConsumerNavbar';
import {
  MapPinIcon,
  ShieldCheckIcon,
  PhoneIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
} from '../components/Icons';
import { farmerListings } from '../data/farmerListings';
import { locationService } from '../services/locationService';

export default function FarmerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find all listings by this farmer
  const farmerProducts = farmerListings.filter((f) => f.farmerId === id);
  const primaryFarmer = farmerProducts[0] || farmerListings[0];

  const userLocation = locationService.getCurrentLocation();
  const distanceKm = locationService.calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    primaryFarmer.latitude,
    primaryFarmer.longitude
  );

  return (
    <div className="farmer-profile-page">
      <ConsumerNavbar />

      <div className="content-container page-inner">
        {/* Profile Hero Card */}
        <div className="farmer-profile-hero card">
          <div className="farmer-hero-main">
            <div className="farmer-avatar-lg">
              <span>{primaryFarmer.farmerName.slice(0, 2).toUpperCase()}</span>
            </div>

            <div className="farmer-hero-info">
              <div className="hero-name-row">
                <h1 className="farmer-title">{primaryFarmer.farmerName}</h1>
                {primaryFarmer.verified && (
                  <span className="badge badge-emerald">
                    <ShieldCheckIcon size={14} /> Verified Producer
                  </span>
                )}
              </div>

              <div className="hero-meta-row">
                <span className="rating-pill">★ {primaryFarmer.rating} (50+ Family Reviews)</span>
                <span className="bullet">•</span>
                <span className="dist-chip">
                  <MapPinIcon size={14} color="#059669" />
                  <strong>{distanceKm} km</strong> from your home
                </span>
                <span className="bullet">•</span>
                <span>{primaryFarmer.subDistrict}, Telangana</span>
              </div>

              <p className="farmer-bio-text">
                "Direct peri-urban family producer practicing sustainable cultivation. Our harvests are picked daily at sunrise and delivered straight to nearby neighborhood kitchens."
              </p>
            </div>
          </div>

          <div className="farmer-hero-cta">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => alert(`Connecting with Farmer: ${primaryFarmer.phone}`)}
            >
              <PhoneIcon size={15} />
              <span>Contact Producer</span>
            </button>
          </div>
        </div>

        {/* Available Products Section */}
        <div className="section-block mt-4">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Available Today from {primaryFarmer.farmerName}</h2>
              <p className="section-sub">Freshly picked produce ready for immediate home delivery or farm pickup</p>
            </div>
          </div>

          <div className="farmer-catalog-grid">
            {farmerProducts.map((item) => (
              <div key={item.id} className="catalog-product-card card">
                <div className="cat-card-top">
                  <span className="badge badge-emerald">{item.quality}</span>
                  <span className="cat-harvest-chip">
                    <ClockIcon size={12} color="#059669" /> Harvested {item.harvestDate}
                  </span>
                </div>

                <div className="cat-product-info">
                  <h3 className="cat-prod-name">{item.product}</h3>
                  <span className="cat-prod-variety">{item.variety}</span>
                  <span className="cat-origin-sub">Origin: <strong>{item.origin}</strong></span>
                </div>

                <div className="cat-price-row">
                  <div className="cat-price-box">
                    <span className="cat-price">₹{item.price}</span>
                    <span className="cat-unit">/ {item.unit}</span>
                  </div>
                  <div className="cat-stock-box">
                    <span className="stock-lbl">Stock:</span>
                    <strong>{item.quantityAvailable} {item.unit}</strong>
                  </div>
                </div>

                <p className="cat-desc-line">"{item.description}"</p>

                <div className="cat-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => navigate(`/order/${item.id}`, { state: { listing: item, quantity: item.minimumOrder || 1 } })}
                  >
                    <span>Order Now (Min: {item.minimumOrder} {item.unit})</span>
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
