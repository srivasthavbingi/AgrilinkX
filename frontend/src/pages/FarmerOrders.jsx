import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  MapPinIcon,
  PackageIcon,
} from '../components/Icons';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';

export default function FarmerOrders() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const farmerId = profile?.farmer_id || user?.id || 'F001';

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('All');

  const loadOrders = async () => {
    const list = await orderService.fetchFarmerOrders(farmerId);
    setOrders([...list]);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err) {
      alert(`Status Change Error: ${err.message}`);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const st = (o.statusText || '').toUpperCase();
    if (activeTab === 'All') return true;
    if (activeTab === 'New') return st === 'PLACED';
    if (activeTab === 'Accepted') return st === 'ACCEPTED';
    if (activeTab === 'Preparing') return st === 'PREPARING' || st === 'READY';
    if (activeTab === 'Completed') return st === 'DELIVERED' || st === 'COMPLETED';
    return true;
  });

  return (
    <div className="farmer-orders-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Farmer Order Management</h1>
          <p className="page-subtitle">
            Incoming direct orders from local families. Accept, prepare harvest, and update delivery status.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/inventory')}
        >
          <PackageIcon size={16} />
          <span>View Produce Inventory</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="tab-navigation mb-4">
        {['All', 'New', 'Accepted', 'Preparing', 'Completed'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'New' && '🔔 '}
            {tab} Orders
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="orders-cards-list">
        {filteredOrders.length === 0 ? (
          <div className="card p-4 text-center">
            <p className="text-muted">No orders found in "{activeTab}" filter.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const st = (order.statusText || 'PLACED').toUpperCase();

            return (
              <div key={order.id} className="card order-management-card mb-3">
                <div className="card-header flex-between">
                  <div className="order-title-group">
                    <span className="badge badge-emerald">{order.id}</span>
                    <h3 className="card-title ml-2">{order.productName}</h3>
                  </div>
                  <span className="order-status-pill">{st}</span>
                </div>

                <div className="order-card-body grid-3">
                  <div className="info-block">
                    <span className="lbl">Customer</span>
                    <strong>{order.customerName}</strong>
                    <span className="sub">{order.farmerLocation}</span>
                  </div>

                  <div className="info-block">
                    <span className="lbl">Quantity & Total</span>
                    <strong>{order.quantity} {order.unit} (₹{order.pricePerUnit}/{order.unit})</strong>
                    <span className="sub text-emerald">Payout Total: ₹{order.totalAmount}</span>
                  </div>

                  <div className="info-block">
                    <span className="lbl">Fulfillment Mode</span>
                    <strong>{order.deliveryType}</strong>
                    <span className="sub">{order.estimatedArrival}</span>
                  </div>
                </div>

                {/* Farmer Action Buttons for Status Progression */}
                <div className="order-card-actions flex-end gap-2 p-3 bg-muted border-top">
                  {st === 'PLACED' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-danger"
                        onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                      >
                        Reject Order
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
                      >
                        ✓ Accept Order
                      </button>
                    </>
                  )}

                  {st === 'ACCEPTED' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(order.id, 'PREPARING')}
                    >
                      📦 Mark Preparing Harvest
                    </button>
                  )}

                  {st === 'PREPARING' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(order.id, 'READY')}
                    >
                      ✅ Mark Ready for Dispatch
                    </button>
                  )}

                  {st === 'READY' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(order.id, 'OUT_FOR_DELIVERY')}
                    >
                      🚚 Mark Out for Delivery
                    </button>
                  )}

                  {st === 'OUT_FOR_DELIVERY' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                    >
                      🎉 Mark Delivered & Settled
                    </button>
                  )}

                  {st === 'DELIVERED' && (
                    <span className="badge badge-emerald">✓ Order Delivered & Completed</span>
                  )}

                  {st === 'CANCELLED' && (
                    <span className="badge badge-rose">Order Cancelled</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
