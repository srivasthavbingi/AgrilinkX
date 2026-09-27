import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ConsumerNavbar from '../components/ConsumerNavbar';
import {
  CheckCircleIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TruckIcon,
  ArrowRightIcon,
  ClockIcon,
  SproutIcon,
} from '../components/Icons';
import { farmerListings } from '../data/farmerListings';
import { orderService } from '../services/orderService';
import { locationService } from '../services/locationService';

export default function Order() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Find listing from state or by id
  const passedListing = location.state?.listing;
  const listing =
    passedListing ||
    farmerListings.find((l) => l.id === id) ||
    farmerListings[0];

  const initialQty = location.state?.quantity || 1;
  const [quantity, setQuantity] = useState(initialQty);
  const [deliveryType, setDeliveryType] = useState('Home Delivery'); // 'Home Delivery' or 'Farm Pickup'

  // If viewing an existing placed order
  const existingOrder = orderService.getOrderById(id);
  const [activeOrder, setActiveOrder] = useState(existingOrder);
  const [isPlaced, setIsPlaced] = useState(Boolean(existingOrder));
  const [demoStatusIndex, setDemoStatusIndex] = useState(existingOrder ? (existingOrder.statusIndex || 0) : 0);

  React.useEffect(() => {
    if (id) {
      orderService.fetchOrderById(id).then((ord) => {
        if (ord) {
          setActiveOrder(ord);
          setIsPlaced(true);
          setDemoStatusIndex(ord.statusIndex || 0);
        }
      });
    }
  }, [id]);

  const userLocation = locationService.getCurrentLocation();
  const itemTotal = Math.round(listing.price * quantity);
  const deliveryFee = deliveryType === 'Farm Pickup' ? 0 : (listing.deliveryFee || 20);
  const grandTotal = itemTotal + deliveryFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      const created = await orderService.createOrder({
        listing,
        quantity,
        deliveryType,
      });
      setActiveOrder(created);
      setIsPlaced(true);
      setDemoStatusIndex(created.statusIndex || 0);
    } catch (err) {
      alert(`Order Creation Failed: ${err.message}`);
    }
  };

  const handleSimulateNextStage = () => {
    if (demoStatusIndex < 4) {
      setDemoStatusIndex((prev) => prev + 1);
    }
  };

  const stages = [
    { title: "Order Placed", desc: "Order sent to farmer" },
    { title: "Farmer Accepted", desc: "Batch reserved at farm" },
    { title: "Preparing Harvest", desc: "Washed & packed" },
    { title: "Out for Delivery", desc: "En-route to your door" },
    { title: "Completed", desc: "Delivered fresh" },
  ];

  return (
    <div className="order-page">
      <ConsumerNavbar />

      <div className="content-container page-inner">
        {!isPlaced ? (
          /* Checkout Formulation View */
          <div className="checkout-container">
            <div className="checkout-header">
              <h1 className="checkout-title">Confirm Direct Producer Order</h1>
              <p className="checkout-sub">
                Small-quantity family purchase direct from verified local producer
              </p>
            </div>

            <div className="checkout-grid">
              {/* Left: Product & Quantity selection */}
              <div className="checkout-card card">
                <div className="checkout-section-title">1. Produce Details</div>

                <div className="checkout-item-summary">
                  <div className="item-icon-box">
                    <SproutIcon size={24} color="#059669" />
                  </div>
                  <div className="item-text-info">
                    <h3 className="item-name">{listing.product}</h3>
                    <span className="item-variety">{listing.variety} • Quality: <strong>{listing.quality}</strong></span>
                    <span className="item-origin">Origin: <strong>{listing.origin}</strong></span>
                  </div>
                  <div className="item-rate">
                    <strong>₹{listing.price}</strong> / {listing.unit}
                  </div>
                </div>

                {/* Quantity picker */}
                <div className="quantity-adjust-box">
                  <label className="qty-label">Select Quantity ({listing.unit}):</label>
                  <div className="qty-counter-group">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setQuantity(Math.max(listing.minimumOrder || 0.25, quantity - 1))}
                    >
                      -
                    </button>
                    <span className="qty-display">{quantity} {listing.unit}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setQuantity(Math.min(listing.quantityAvailable, quantity + 1))}
                    >
                      +
                    </button>
                  </div>
                  <span className="qty-hint">
                    Min order: {listing.minimumOrder} {listing.unit} • Max available: {listing.quantityAvailable} {listing.unit}
                  </span>
                </div>

                {/* Delivery Option */}
                <div className="delivery-option-group">
                  <label className="qty-label">Fulfillment Option:</label>
                  <div className="delivery-pills">
                    <button
                      type="button"
                      className={`deliv-pill ${deliveryType === 'Home Delivery' ? 'active' : ''}`}
                      onClick={() => setDeliveryType('Home Delivery')}
                    >
                      <TruckIcon size={16} />
                      <div>
                        <strong>Home Delivery</strong>
                        <span>Estimated within 35 mins (+₹{listing.deliveryFee || 20})</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`deliv-pill ${deliveryType === 'Farm Pickup' ? 'active' : ''}`}
                      onClick={() => setDeliveryType('Farm Pickup')}
                    >
                      <MapPinIcon size={16} />
                      <div>
                        <strong>Farm Pickup</strong>
                        <span>Pick up direct at farm gate (₹0 fee)</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Producer & Bill Breakdown */}
              <div className="bill-card card">
                <div className="checkout-section-title">2. Producer & Payment</div>

                <div className="producer-mini-card">
                  <div className="producer-title-row">
                    <strong>{listing.farmerName}</strong>
                    {listing.verified && <span className="badge badge-emerald">Verified ✓</span>}
                  </div>
                  <span className="producer-loc-line">
                    <MapPinIcon size={12} color="#64748b" />
                    {listing.subDistrict} ({listing.distance} km from your address)
                  </span>
                </div>

                <div className="bill-breakdown">
                  <div className="bill-row">
                    <span>Produce Total ({quantity} {listing.unit} × ₹{listing.price})</span>
                    <strong>₹{itemTotal}</strong>
                  </div>
                  <div className="bill-row">
                    <span>Delivery Fee ({deliveryType})</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="bill-row bill-grand-total">
                    <span>Total Payout (UPI / Escrow)</span>
                    <strong className="text-emerald">₹{grandTotal}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full"
                  onClick={handlePlaceOrder}
                >
                  <span>Place Order (₹{grandTotal})</span>
                  <ArrowRightIcon size={16} />
                </button>
                <span className="security-subtext">
                  <ShieldCheckIcon size={13} color="#059669" />
                  100% Guaranteed fresh produce directly paid to farmer
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Live Order Status Tracking View */
          <div className="order-status-view card">
            <div className="order-status-header">
              <div className="status-title-group">
                <span className="badge badge-emerald">Order Active</span>
                <h2 className="order-id-title">Order #{activeOrder.id}</h2>
                <span className="order-time-sub">Placed {activeOrder.orderTime} • {activeOrder.productName} ({activeOrder.quantity} {activeOrder.unit})</span>
              </div>
              <div className="order-total-badge">
                <span className="total-label">Total Amount</span>
                <strong className="total-val">₹{activeOrder.totalAmount}</strong>
              </div>
            </div>

            {/* 5-Stage Live Status Progression */}
            <div className="order-milestone-tracker">
              {stages.map((stg, idx) => {
                const isPassed = idx <= demoStatusIndex;
                const isCurrent = idx === demoStatusIndex;

                return (
                  <div
                    key={idx}
                    className={`order-step ${isPassed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                  >
                    <div className="step-marker">
                      {isPassed ? <CheckCircleIcon size={16} color="#ffffff" /> : idx + 1}
                    </div>
                    <div className="step-label-box">
                      <strong className="step-name">{stg.title}</strong>
                      <span className="step-desc">{stg.desc}</span>
                    </div>
                    {idx < stages.length - 1 && <div className="step-connector-line"></div>}
                  </div>
                );
              })}
            </div>

            {/* Live details grid */}
            <div className="order-details-grid">
              <div className="detail-box">
                <span className="lbl">Assigned Producer</span>
                <strong>{activeOrder.farmerName}</strong>
                <span className="sub">{activeOrder.farmerLocation}</span>
              </div>
              <div className="detail-box">
                <span className="lbl">Delivery Mode</span>
                <strong>{activeOrder.deliveryType}</strong>
                <span className="sub">{activeOrder.estimatedArrival}</span>
              </div>
              <div className="detail-box">
                <span className="lbl">Payment Status</span>
                <strong className="text-emerald">{activeOrder.paymentStatus}</strong>
                <span className="sub">{activeOrder.paymentMethod}</span>
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="simulation-actions-bar">
              <span className="sim-hint">
                ⚡ Demo simulation: test consumer tracking progression (Frontend Preview Only)
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleSimulateNextStage}
                disabled={demoStatusIndex >= 4}
              >
                <span>Simulate Next Stage (➔ {stages[Math.min(4, demoStatusIndex + 1)].title})</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/')}
              >
                <span>Back to Family Store</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
