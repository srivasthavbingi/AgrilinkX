import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip as LeafletTooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Component to dynamically fit or center bounds
function MapViewUpdater({ center, zoom, routeCoords }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } else if (center) {
      map.setView(center, zoom || 11, { animate: true });
    }
  }, [center, zoom, routeCoords, map]);

  return null;
}

// Helper to create HTML DivIcons so we never encounter Vite missing-PNG icon bugs
const createCustomMarker = (type, label) => {
  const configs = {
    farmer: {
      bg: '#059669',
      border: '#ffffff',
      iconText: '🚜',
      color: '#ffffff',
      shadow: 'rgba(5, 150, 105, 0.4)',
    },
    market: {
      bg: '#d97706',
      border: '#ffffff',
      iconText: '🏛️',
      color: '#ffffff',
      shadow: 'rgba(217, 119, 6, 0.4)',
    },
    storage: {
      bg: '#0284c7',
      border: '#ffffff',
      iconText: '❄️',
      color: '#ffffff',
      shadow: 'rgba(2, 132, 199, 0.4)',
    },
    warehouse: {
      bg: '#475569',
      border: '#ffffff',
      iconText: '🏢',
      color: '#ffffff',
      shadow: 'rgba(71, 85, 105, 0.4)',
    },
    buyer: {
      bg: '#7c3aed',
      border: '#ffffff',
      iconText: '🤝',
      color: '#ffffff',
      shadow: 'rgba(124, 58, 237, 0.4)',
    },
  };

  const cfg = configs[type] || configs.storage;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        background: ${cfg.bg};
        color: ${cfg.color};
        border: 2.5px solid ${cfg.border};
        border-radius: 50%;
        box-shadow: 0 4px 14px ${cfg.shadow};
        font-size: 18px;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span>${cfg.iconText}</span>
        ${
          type === 'farmer'
            ? `<div style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                border: 2px solid #10b981;
                animation: pulse 2s infinite;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
};

export default function AgriMap({
  farmer,
  storages = [],
  markets = [],
  buyers = [],
  selectedDestination = null,
  activeRoute = null,
  onSelectStorage,
  onViewDetails,
  onStoreCrop,
  height = '560px',
}) {
  const defaultCenter = [farmer.latitude || 17.251, farmer.longitude || 78.432];

  // Memoize marker icons
  const icons = useMemo(() => ({
    farmer: createCustomMarker('farmer'),
    market: createCustomMarker('market'),
    coldStorage: createCustomMarker('storage'),
    warehouse: createCustomMarker('warehouse'),
    buyer: createCustomMarker('buyer'),
  }), []);

  return (
    <div className="agri-map-wrapper card" style={{ height, width: '100%', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={10}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapViewUpdater
          center={defaultCenter}
          zoom={10}
          routeCoords={activeRoute?.coordinates}
        />

        {/* Standard OpenStreetMap Tile Layer - zero API keys required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* 1. Farmer Marker */}
        {farmer && (
          <Marker position={[farmer.latitude, farmer.longitude]} icon={icons.farmer}>
            <Popup className="agri-map-popup">
              <div className="popup-card">
                <span className="badge badge-emerald">Your Farm Location</span>
                <h4 className="popup-title">{farmer.name}</h4>
                <p className="popup-sub">{farmer.address}</p>
                <div className="popup-metrics">
                  <div>Active Crop: <strong>{farmer.activeCrop}</strong></div>
                  <div>Lot Quantity: <strong>{farmer.activeQuantityKg} kg</strong></div>
                </div>
              </div>
            </Popup>
            <LeafletTooltip direction="top" offset={[0, -20]} opacity={0.9} permanent={false}>
              Farmer Ramesh (Shamshabad)
            </LeafletTooltip>
          </Marker>
        )}

        {/* 2. Storages Markers */}
        {storages.map((storage) => {
          const isCold = storage.type === 'Cold Storage';
          const icon = isCold ? icons.coldStorage : icons.warehouse;

          return (
            <Marker
              key={storage.id}
              position={[storage.latitude, storage.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onSelectStorage) onSelectStorage(storage);
                },
              }}
            >
              <Popup className="agri-map-popup">
                <div className="popup-card">
                  <div className="popup-header-row">
                    <span className={`badge ${isCold ? 'badge-blue' : 'badge-gold'}`}>
                      {storage.type}
                    </span>
                    <span className="popup-distance">{storage.distance} km away</span>
                  </div>

                  <h4 className="popup-title">{storage.name}</h4>
                  <p className="popup-sub">{storage.address}</p>

                  <div className="popup-grid-data">
                    <div className="data-box">
                      <span className="lbl">Available Cap:</span>
                      <strong>{storage.availableCapacity} / {storage.totalCapacity} Tons</strong>
                    </div>
                    <div className="data-box">
                      <span className="lbl">Rate / kg / day:</span>
                      <strong className="text-emerald">₹{storage.pricePerKgPerDay}</strong>
                    </div>
                    <div className="data-box">
                      <span className="lbl">Temperature:</span>
                      <span>{storage.temperatureControlled ? 'Controlled (2-8°C)' : 'Ambient Ventilated'}</span>
                    </div>
                    <div className="data-box">
                      <span className="lbl">Rating:</span>
                      <span>★ {storage.rating} {storage.verified ? '• Verified' : ''}</span>
                    </div>
                  </div>

                  <div className="popup-crops-list">
                    <span className="lbl">Supported:</span>
                    <span>{storage.supportedCrops.join(', ')}</span>
                  </div>

                  <div className="popup-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        if (onViewDetails) onViewDetails(storage);
                      }}
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (onStoreCrop) onStoreCrop(storage);
                      }}
                    >
                      Store My Crop
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. Markets / Mandis Markers */}
        {markets.map((mkt) => (
          <Marker
            key={mkt.id}
            position={[mkt.latitude, mkt.longitude]}
            icon={icons.market}
            eventHandlers={{
              click: () => {
                if (onSelectStorage) onSelectStorage(mkt, 'market');
              },
            }}
          >
            <Popup className="agri-map-popup">
              <div className="popup-card">
                <span className="badge badge-gold">APMC Mandi</span>
                <h4 className="popup-title">{mkt.name}</h4>
                <p className="popup-sub">Distance: <strong>{mkt.distance} km</strong> • Demand: <strong>{mkt.demand}</strong></p>

                <div className="popup-grid-data">
                  <div className="data-box">
                    <span className="lbl">Market Price:</span>
                    <strong className="text-emerald">₹{mkt.modalPrice}/kg</strong>
                  </div>
                  <div className="data-box">
                    <span className="lbl">Price Range:</span>
                    <span>₹{mkt.minPrice} - ₹{mkt.maxPrice}</span>
                  </div>
                  <div className="data-box">
                    <span className="lbl">Est. Transport:</span>
                    <span>₹{mkt.transportCost.toLocaleString()}</span>
                  </div>
                  <div className="data-box">
                    <span className="lbl">Net Realization:</span>
                    <strong className="text-emerald">₹{mkt.expectedNetRealization.toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm w-full mt-2"
                  onClick={() => {
                    if (onSelectStorage) onSelectStorage(mkt, 'market');
                  }}
                >
                  Route to this Mandi
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Verified Buyers Markers */}
        {buyers.map((buyer) => (
          <Marker
            key={buyer.id}
            position={[buyer.latitude, buyer.longitude]}
            icon={icons.buyer}
            eventHandlers={{
              click: () => {
                if (onSelectStorage) onSelectStorage(buyer, 'buyer');
              },
            }}
          >
            <Popup className="agri-map-popup">
              <div className="popup-card">
                <span className="badge badge-emerald">{buyer.verification}</span>
                <h4 className="popup-title">{buyer.name}</h4>
                <p className="popup-sub">Distance: <strong>{buyer.distance} km</strong></p>

                <div className="popup-grid-data">
                  <div className="data-box">
                    <span className="lbl">Offered Price:</span>
                    <strong className="text-emerald">{buyer.offeredPrice}</strong>
                  </div>
                  <div className="data-box">
                    <span className="lbl">Required Crop:</span>
                    <span>{buyer.requiredCrop}</span>
                  </div>
                  <div className="data-box">
                    <span className="lbl">Required Quota:</span>
                    <span>{buyer.requiredQuantity}</span>
                  </div>
                  <div className="data-box">
                    <span className="lbl">Rating:</span>
                    <span>★ {buyer.rating}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm w-full mt-2"
                  onClick={() => {
                    if (onSelectStorage) onSelectStorage(buyer, 'buyer');
                  }}
                >
                  Initiate Direct Deal
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 5. Active Logistics Route Polyline */}
        {activeRoute && activeRoute.coordinates && (
          <Polyline
            positions={activeRoute.coordinates}
            pathOptions={{
              color: '#059669',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          >
            <LeafletTooltip sticky direction="top">
              <div>
                <strong>Route: {activeRoute.originName} ➔ {activeRoute.destinationName}</strong>
                <br />
                {activeRoute.distanceKm} km • {activeRoute.estimatedDuration} • Est. Freight: ₹{activeRoute.estimatedCost.toLocaleString()}
              </div>
            </LeafletTooltip>
          </Polyline>
        )}
      </MapContainer>
    </div>
  );
}
