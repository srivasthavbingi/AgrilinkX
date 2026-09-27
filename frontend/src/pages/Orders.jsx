import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConsumerNavbar from '../components/ConsumerNavbar';
import {
  CheckCircleIcon,
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import { orderService } from '../services/orderService';
import { api } from '../services/api';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    orderService.fetchOrders().then((list) => {
      setOrders([...list]);
      setApiLoading(false);
    });
  }, []);

  return (
    <div className="customer-orders-page">
      <ConsumerNavbar />

      <div className="orders-content-inner page-inner">
        <div className="page-header-block mb-4">
          <h1 className="page-title">My Family Orders</h1>
          <p className="page-sub">
            Track real-time direct farm purchase status, estimated delivery times, and producer details.
          </p>
        </div>

        <div className="orders-list-wrapper">
          {orders.length === 0 ? (
            <div className="card p-4 text-center">
              <h3>No orders placed yet</h3>
              <p className="text-muted mb-3">Explore fresh produce from nearby farmers on the Family Store.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                Go to Family Store
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="card customer-order-card mb-3">
                <div className="card-header flex-between">
                  <div className="order-title-group">
                    <span className="badge badge-emerald">{order.id}</span>
                    <h3 className="card-title ml-2">{order.productName}</h3>
                  </div>
                  <span className="order-status-badge">{order.statusText}</span>
                </div>

                <div className="order-body-grid">
                  <div className="body-col">
                    <span className="lbl">Producer / Farmer</span>
                    <strong>{order.farmerName}</strong>
                    <span className="sub">{order.farmerLocation}</span>
                  </div>

                  <div className="body-col">
                    <span className="lbl">Quantity & Price</span>
                    <strong>{order.quantity} {order.unit} @ ₹{order.pricePerUnit}/{order.unit}</strong>
                    <span className="sub">Item Total: ₹{order.itemTotal}</span>
                  </div>

                  <div className="body-col">
                    <span className="lbl">Total Paid (Escrow)</span>
                    <strong className="text-emerald">₹{order.totalAmount}</strong>
                    <span className="sub">{order.paymentMethod}</span>
                  </div>

                  <div className="body-col">
                    <span className="lbl">Fulfillment Mode</span>
                    <strong>{order.deliveryType}</strong>
                    <span className="sub">{order.estimatedArrival}</span>
                  </div>
                </div>

                <div className="card-footer flex-between p-3 bg-muted border-top">
                  <span className="order-time-stamp">Placed: {order.orderTime}</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/order/${order.id}`)}
                  >
                    <span>View Live Status Tracker</span>
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
