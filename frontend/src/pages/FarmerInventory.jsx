import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SproutIcon,
  PackageIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import { inventoryService } from '../services/inventoryService';
import { orderService } from '../services/orderService';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FarmerInventory() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  // Use authenticated farmer's UUID (profile.farmer_id or user.id) as the farmer_id for Supabase linkage.
  const farmerId = profile?.farmer_id || user?.id;
  const farmerDisplayName = profile?.farm_name || profile?.full_name || 'Ravi Farms';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    product: '',
    category: 'Vegetables',
    variety: '',
    quantity: 10,
    unit: 'kg',
    price: 28,
    quality: 'Grade A',
    harvestDate: new Date().toISOString().split('T')[0],
    origin: 'Telangana',
    minimumOrder: 1,
    deliveryAvailable: true,
    description: '',
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Try FastAPI first — returns the most up-to-date DB data
      const apiData = await api.getInventory(farmerId);
      if (Array.isArray(apiData) && apiData.length > 0) {
        // Normalize camelCase fields from snake_case API response
        const normalized = apiData.map((item) => ({
          ...item,
          quantityAvailable: item.quantity_available ?? item.quantityAvailable ?? 0,
          availabilityStatus: item.availability_status ?? item.availabilityStatus ?? 'Available',
          deliveryAvailable: item.delivery_available ?? item.deliveryAvailable ?? true,
          minimumOrder: item.minimum_order ?? item.minimumOrder ?? 1,
          harvestDate: item.harvest_date ?? item.harvestDate ?? '',
          farmerName: item.farmer_name ?? item.farmerName ?? 'Ravi Farms',
        }));
        setProducts(normalized);
        setLoading(false);
        return;
      }
    } catch {
      // API offline — fall through to local inventoryService
    }
    const data = await inventoryService.getFarmerProducts(farmerId);
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const unsubscribe = inventoryService.subscribe(() => {
      loadProducts();
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product.trim()) return;

    const payload = {
      farmer_id: farmerId,
      farmer_name: farmerDisplayName,
      user_id: user?.id || null,  // Pass auth user UUID for Supabase RLS
      product: formData.product,
      category: formData.category,
      variety: formData.variety,
      quantity_available: Number(formData.quantity),
      unit: formData.unit,
      price: Number(formData.price),
      quality: formData.quality,
      harvest_date: formData.harvestDate,
      origin: formData.origin,
      minimum_order: Number(formData.minimumOrder),
      delivery_available: formData.deliveryAvailable,
      description: formData.description,
    };

    if (editingId) {
      // Update local first (instant UI)
      await inventoryService.updateFarmerProduct(editingId, formData);
      // Sync to FastAPI (fire-and-forget with error log)
      api.updateInventory(editingId, payload).catch((err) =>
        console.warn('[FarmerInventory] FastAPI update failed:', err.message)
      );
      setEditingId(null);
    } else {
      // Add locally first (instant UI)
      await inventoryService.addFarmerProduct({ ...formData, farmerId, userId: user?.id, farmerName: farmerDisplayName });
      // Sync to FastAPI (fire-and-forget)
      api.addInventory(payload).catch((err) =>
        console.warn('[FarmerInventory] FastAPI add failed:', err.message)
      );
    }

    setFormData({
      product: '',
      category: 'Vegetables',
      variety: '',
      quantity: 10,
      unit: 'kg',
      price: 28,
      quality: 'Grade A',
      harvestDate: new Date().toISOString().split('T')[0],
      origin: 'Telangana',
      minimumOrder: 1,
      deliveryAvailable: true,
      description: '',
    });
    setShowAddForm(false);
    loadProducts();
  };

  const handleEditClick = (item) => {
    setFormData({
      product: item.product,
      category: item.category || 'Vegetables',
      variety: item.variety || '',
      quantity: item.quantityAvailable,
      unit: item.unit || 'kg',
      price: item.price,
      quality: item.quality || 'Grade A',
      harvestDate: item.harvestDate || new Date().toISOString().split('T')[0],
      origin: item.origin || 'Telangana',
      minimumOrder: item.minimumOrder || 1,
      deliveryAvailable: item.deliveryAvailable ?? true,
      description: item.description || '',
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleQuickQtyUpdate = async (id, currentQty) => {
    const newQtyStr = prompt(`Enter updated available quantity for item:`, currentQty);
    if (newQtyStr !== null && !isNaN(newQtyStr)) {
      const newQty = Number(newQtyStr);
      await inventoryService.updateQuantity(id, newQty);
      // Sync to FastAPI
      api.updateInventory(id, { quantity_available: newQty }).catch(() => {});
      loadProducts();
    }
  };

  const handleMarkUnavailable = async (id) => {
    if (confirm('Mark this product as Unavailable? It will be hidden from consumer search.')) {
      await inventoryService.markProductUnavailable(id);
      // Sync to FastAPI
      api.updateInventory(id, { quantity_available: 0 }).catch(() => {});
      loadProducts();
    }
  };

  // Metrics summary
  const totalProducts = products.length;
  const totalQuantity = products.reduce((acc, p) => acc + (p.quantityAvailable || 0), 0);
  const availableTodayCount = products.filter(
    (p) => p.availabilityStatus === 'Available' && p.quantityAvailable > 0
  ).length;
  const farmerOrders = orderService.getFarmerOrders(farmerId);
  const pendingOrdersCount = farmerOrders.filter((o) => o.statusText === 'Placed' || o.statusIndex === 0).length;

  return (
    <div className="farmer-inventory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Farmer Produce Inventory</h1>
          <p className="page-subtitle">
            Manage your harvests, set prices, update available stock, and broadcast to nearby families.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingId(null);
              setShowAddForm(!showAddForm);
            }}
          >
            <PlusIcon size={16} />
            <span>{showAddForm ? 'Close Form' : 'Add New Product'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="stats-grid mb-4">
        <div className="stat-card card">
          <div className="stat-icon-wrap icon-emerald">
            <PackageIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Products</span>
            <strong className="stat-value">{totalProducts}</strong>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon-wrap icon-blue">
            <SproutIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Available Supply</span>
            <strong className="stat-value">{totalQuantity} kg</strong>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon-wrap icon-gold">
            <CheckCircleIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Products Active Today</span>
            <strong className="stat-value">{availableTodayCount}</strong>
          </div>
        </div>

        <div className="stat-card card" onClick={() => navigate('/farmer/orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrap icon-rose">
            <ClockIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Orders Pending</span>
            <strong className="stat-value text-rose">{pendingOrdersCount} New</strong>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <div className="card form-modal-card mb-4">
          <div className="card-header">
            <h3 className="card-title">
              {editingId ? 'Edit Product Harvest' : 'Add New Product to Family Marketplace'}
            </h3>
            <span className="card-subtitle">
              Products added here become instantly discoverable by nearby families in your search radius.
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="inventory-form-grid">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                name="product"
                placeholder="e.g. Tomato, Assam Tea, Toor Dal..."
                value={formData.product}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Pulses">Pulses</option>
                <option value="Spices">Spices</option>
                <option value="Tea">Tea</option>
                <option value="Dairy">Dairy</option>
                <option value="Other Farm Products">Other Farm Products</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Variety / Type</label>
              <input
                type="text"
                name="variety"
                placeholder="e.g. Hybrid Red, Desi Organic, Orthodox..."
                value={formData.variety}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity Available *</label>
              <div className="input-group">
                <input
                  type="number"
                  name="quantity"
                  step="0.5"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="form-select-sm"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="bundle">bundle</option>
                  <option value="dozen">dozen</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Price per Unit (₹) *</label>
              <input
                type="number"
                name="price"
                step="1"
                value={formData.price}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quality Grade</label>
              <select
                name="quality"
                value={formData.quality}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="Grade A+">Grade A+ (Premium Export)</option>
                <option value="Grade A">Grade A (Fresh Field Standard)</option>
                <option value="Grade B">Grade B (Standard Commercial)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Harvest Date</label>
              <input
                type="date"
                name="harvestDate"
                value={formData.harvestDate}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Origin / State</label>
              <input
                type="text"
                name="origin"
                placeholder="e.g. Telangana, Assam, Kashmir..."
                value={formData.origin}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Order Quantity</label>
              <input
                type="number"
                name="minimumOrder"
                step="0.25"
                value={formData.minimumOrder}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Description / Special Badges</label>
              <input
                type="text"
                name="description"
                placeholder="e.g. Freshly picked at dawn, firm, pesticide-free..."
                value={formData.description}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-group full-width checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="deliveryAvailable"
                  checked={formData.deliveryAvailable}
                  onChange={handleInputChange}
                />
                <span>Direct Home Delivery Available</span>
              </label>
            </div>

            <div className="form-actions full-width">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Save Changes' : 'Add Product to Marketplace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory Listings Table / Grid */}
      <div className="card">
        <div className="card-header flex-between">
          <div>
            <h3 className="card-title">MY AVAILABLE PRODUCTS</h3>
            <span className="card-subtitle">Active produce items broadcasted to local family searches</span>
          </div>
          <span className="badge badge-emerald">Connected to Supabase DB</span>
        </div>

        {loading ? (
          <div className="loading-box p-4 text-center">Loading Inventory...</div>
        ) : products.length === 0 ? (
          <div className="empty-box p-4 text-center">
            <p>No products listed yet. Click "Add New Product" above to publish your first harvest!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category / Variety</th>
                  <th>Available Quantity</th>
                  <th>Price</th>
                  <th>Quality</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => {
                  const isAvailable = item.availabilityStatus === 'Available' && item.quantityAvailable > 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="prod-table-cell">
                          <strong>{item.product}</strong>
                          <span className="sub-text">Origin: {item.origin}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{item.category}</span>
                        <div className="sub-text mt-1">{item.variety}</div>
                      </td>
                      <td>
                        <strong className={isAvailable ? 'text-emerald' : 'text-rose'}>
                          {item.quantityAvailable} {item.unit}
                        </strong>
                        <div className="sub-text">Min: {item.minimumOrder} {item.unit}</div>
                      </td>
                      <td>
                        <strong className="price-tag">₹{item.price}</strong> / {item.unit}
                      </td>
                      <td>
                        <span className="badge badge-emerald">{item.quality}</span>
                      </td>
                      <td>
                        <span className={`badge ${isAvailable ? 'badge-emerald' : 'badge-rose'}`}>
                          {isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => handleEditClick(item)}
                            title="Edit details"
                          >
                            <EditIcon size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => handleQuickQtyUpdate(item.id, item.quantityAvailable)}
                            title="Update stock"
                          >
                            Update Qty
                          </button>
                          {isAvailable && (
                            <button
                              type="button"
                              className="btn btn-outline btn-xs btn-danger"
                              onClick={() => handleMarkUnavailable(item.id)}
                              title="Hide from consumer search"
                            >
                              Mark Unavailable
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
