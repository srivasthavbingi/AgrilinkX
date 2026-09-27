import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

// Center updater
function MapBoundsUpdater({ userLocation, farmers, searchRadius, selectedFarmer }) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedFarmer &&
      typeof selectedFarmer.latitude === 'number' &&
      !isNaN(selectedFarmer.latitude) &&
      typeof selectedFarmer.longitude === 'number' &&
      !isNaN(selectedFarmer.longitude)
    ) {
      map.setView([selectedFarmer.latitude, selectedFarmer.longitude], 14, { animate: true });
    } else if (userLocation && farmers && farmers.length > 0) {
      const points = [
        [userLocation.latitude, userLocation.longitude],
        ...farmers.map((f) => [f.latitude, f.longitude]),
      ];
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 12, { animate: true });
    }
  }, [userLocation, farmers, selectedFarmer, map]);

  return null;
}

// Custom HTML Markers for Consumer Map
const createUserMarker = () => {
  return L.divIcon({
    className: 'consumer-user-marker',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        background: #0284c7;
        color: #ffffff;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
      ">
        <span>🏠</span>
        <div style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid rgba(2, 132, 199, 0.6);
          animation: pulse 2s infinite;
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const createFarmerMarker = (isBestMatch = false, isSelected = false) => {
  const bg = isBestMatch ? '#059669' : isSelected ? '#0284c7' : '#15803d';
  const border = isBestMatch ? '#f59e0b' : isSelected ? '#38bdf8' : '#ffffff';
  const borderWidth = isBestMatch || isSelected ? '3px' : '2px';
  const shadow = isBestMatch
    ? 'rgba(245, 158, 11, 0.5)'
    : isSelected
    ? 'rgba(2, 132, 199, 0.5)'
    : 'rgba(21, 128, 61, 0.3)';

  return L.divIcon({
    className: 'consumer-farmer-marker',
    html: `
      <div style="
        position: relative;
        width: ${isBestMatch || isSelected ? '42px' : '36px'};
        height: ${isBestMatch || isSelected ? '42px' : '36px'};
        background: ${bg};
        color: #ffffff;
        border: ${borderWidth} solid ${border};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isBestMatch || isSelected ? '20px' : '16px'};
        box-shadow: 0 4px 14px ${shadow};
      ">
        <span>${isBestMatch ? '⭐' : '🌱'}</span>
        ${
          isBestMatch
            ? `<div style="
                position: absolute;
                top: -8px;
                right: -6px;
                background: #f59e0b;
                color: #ffffff;
                font-size: 10px;
                font-weight: 800;
                padding: 1px 4px;
                border-radius: 4px;
                line-height: 1;
                border: 1px solid #ffffff;
              ">#1</div>`
            : ''
        }
      </div>
    `,
    iconSize: isBestMatch || isSelected ? [42, 42] : [36, 36],
    iconAnchor: isBestMatch || isSelected ? [21, 21] : [18, 18],
    popupAnchor: [0, -24],
  });
};

export default function ConsumerMap({
  userLocation,
  farmers = [],
  bestMatchId = null,
  selectedFarmer = null,
  searchRadius = 5,
  height = '480px',
  onSelectFarmer,
}) {
  const navigate = useNavigate();

  const userIcon = useMemo(() => createUserMarker(), []);
  const bestIcon = useMemo(() => createFarmerMarker(true, false), []);
  const selectedIcon = useMemo(() => createFarmerMarker(false, true), []);
  const regularIcon = useMemo(() => createFarmerMarker(false, false), []);

  const defaultCenter = [userLocation?.latitude || 17.4156, userLocation?.longitude || 78.4350];

  // Exclude listings with missing/invalid coordinates from map pins
  const validFarmers = useMemo(() => {
    return (farmers || []).filter(
      (f) =>
        f &&
        typeof f.latitude === 'number' &&
        !isNaN(f.latitude) &&
        typeof f.longitude === 'number' &&
        !isNaN(f.longitude)
    );
  }, [farmers]);

  return (
    <div className="consumer-map-card card" style={{ height, width: '100%', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapBoundsUpdater
          userLocation={userLocation}
          farmers={validFarmers}
          searchRadius={searchRadius}
          selectedFarmer={selectedFarmer}
        />

        {/* Free OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Visual search radius circle around user */}
        {userLocation && (
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={searchRadius * 1000} // meters
            pathOptions={{
              color: '#059669',
              fillColor: '#10b981',
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* 1. User Location Pin */}
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup className="consumer-map-popup">
              <div className="popup-card">
                <span className="badge badge-blue">Your Family Location</span>
                <h4 className="popup-title">{userLocation.area || 'Current Location'}</h4>
                <p className="popup-sub">{userLocation.label || 'Banjara Hills, Hyderabad'}</p>
                <div className="popup-hint">
                  Showing available producers within <strong>{searchRadius} km</strong>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. Valid Farmer Markers */}
        {validFarmers.map((farmer) => {
          const isBest = farmer.id === bestMatchId;
          const isSelected = selectedFarmer && farmer.id === selectedFarmer.id;
          const icon = isBest ? bestIcon : isSelected ? selectedIcon : regularIcon;

          return (
            <Marker
              key={farmer.id}
              position={[farmer.latitude, farmer.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onSelectFarmer) onSelectFarmer(farmer);
                },
              }}
            >
              <Popup className="consumer-map-popup">
                <div className="popup-card">
                  <div className="popup-header-row">
                    <span className={`badge ${isBest ? 'badge-gold' : 'badge-emerald'}`}>
                      {isBest ? '🥇 #1 Recommended' : 'Direct Producer'}
                    </span>
                    <span className="popup-distance">{farmer.distance} km away</span>
                  </div>

                  <h4 className="popup-title">{farmer.farmerName}</h4>
                  <p className="popup-sub">
                    {farmer.product} ({farmer.variety}) • Origin: <strong>{farmer.origin || 'Local Farm'}</strong>
                  </p>

                  <div className="popup-grid-data">
                    <div className="data-box">
                      <span className="lbl">Price:</span>
                      <strong className="text-emerald">₹{farmer.price} / {farmer.unit || 'kg'}</strong>
                    </div>
                    <div className="data-box">
                      <span className="lbl">Available:</span>
                      <strong>{farmer.quantityAvailable} {farmer.unit || 'kg'}</strong>
                    </div>
                    <div className="data-box">
                      <span className="lbl">Quality:</span>
                      <span>{farmer.quality || 'Grade A'}</span>
                    </div>
                    <div className="data-box">
                      <span className="lbl">Rating:</span>
                      <span>★ {farmer.rating || 4.5} ({farmer.verified ? 'Verified ✓' : 'Unverified'})</span>
                    </div>
                  </div>

                  <div className="popup-actions mt-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm flex-1"
                      onClick={() => navigate(`/farmer/${farmer.farmerId || farmer.farmer_id}`)}
                    >
                      View Farmer
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex-1"
                      onClick={() => navigate(`/order/${farmer.id}`, { state: { listing: farmer } })}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
