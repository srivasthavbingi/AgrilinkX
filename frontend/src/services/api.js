/**
 * AgriLinkX — FastAPI Backend Integration Service
 * All database operations go through the FastAPI backend (never direct Supabase from here).
 * Base URL: http://127.0.0.1:8000
 */

import { supabase } from '../supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Generic fetch helper with error handling
async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...headers, ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(detail.detail || `API error ${response.status}`);
  }
  return response.json();
}

export const api = {
  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH / RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Search farmers/products via FastAPI recommendation engine.
   * GET /api/search?product=...&quantity=...&latitude=...&longitude=...&preference=...
   */
  async searchProducts({ product = 'Tomato', quantity = 1, latitude = 17.404, longitude = 78.456, preference = 'Nearest' }) {
    const params = new URLSearchParams({
      product: String(product),
      quantity: String(quantity),
      latitude: String(latitude),
      longitude: String(longitude),
      preference: String(preference),
    });
    return apiFetch(`/api/search?${params}`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INVENTORY CRUD  (canonical /api/inventory routes)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/inventory — optionally filtered by farmer_id
   */
  async getInventory(farmerId = null) {
    const path = farmerId ? `/api/inventory?farmer_id=${encodeURIComponent(farmerId)}` : '/api/inventory';
    return apiFetch(path);
  },

  /**
   * GET /api/inventory/{id}
   */
  async getInventoryItem(id) {
    return apiFetch(`/api/inventory/${encodeURIComponent(id)}`);
  },

  /**
   * POST /api/inventory — add new product listing from Farmer Portal
   */
  async addInventory(payload) {
    return apiFetch('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * PATCH /api/inventory/{id} — update product fields
   */
  async updateInventory(id, updates) {
    return apiFetch(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * DELETE /api/inventory/{id}
   */
  async deleteInventory(id) {
    return apiFetch(`/api/inventory/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  /**
   * POST /api/inventory/{id}/reduce — safe atomic quantity decrement (never < 0)
   * @param {string} id - product/inventory item ID
   * @param {number} quantity - how much to reduce by (e.g. 1 to go from 10kg → 9kg)
   */
  async reduceInventory(id, quantity) {
    return apiFetch(`/api/inventory/${encodeURIComponent(id)}/reduce`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ORDERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/orders — create an order + auto-reduces inventory atomically
   */
  async createOrder({ customer_name, farmer_id, product_id, quantity, unit, price_per_unit, total_amount, delivery_method = 'Home Delivery' }) {
    return apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ customer_name, farmer_id, product_id, quantity, unit, price_per_unit, total_amount, delivery_method }),
    });
  },

  /**
   * GET /api/orders — fetch all orders (optionally filtered by farmer_id)
   */
  async getOrders(farmerId = null) {
    const path = farmerId ? `/api/orders?farmer_id=${encodeURIComponent(farmerId)}` : '/api/orders';
    return apiFetch(path);
  },

  /**
   * GET /api/orders/{id} — fetch a single order by ID
   */
  async getOrder(id) {
    return apiFetch(`/api/orders/${encodeURIComponent(id)}`);
  },

  /**
   * PATCH /api/orders/{id}/status — update order status
   */
  async updateOrderStatus(id, status) {
    return apiFetch(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export default api;
