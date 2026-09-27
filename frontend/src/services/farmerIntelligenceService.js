/**
 * AgriLinkX — Farmer Market Intelligence Service
 * Calls the 3 new authenticated farmer intelligence endpoints.
 * All requests include the Supabase Bearer token via the shared apiFetch helper.
 */

import { supabase } from '../supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function apiFetch(path) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const farmerIntelligenceService = {
  /**
   * GET /api/farmer/market-intelligence
   * Returns: dashboard summary stats for the authenticated farmer.
   */
  async getMarketIntelligence() {
    return apiFetch('/api/farmer/market-intelligence');
  },

  /**
   * GET /api/farmer/price-intelligence
   * Returns: per-product price comparison + suggested price.
   */
  async getPriceIntelligence() {
    return apiFetch('/api/farmer/price-intelligence');
  },

  /**
   * GET /api/farmer/demand-intelligence
   * Returns: per-product demand classification + price trend points.
   */
  async getDemandIntelligence() {
    return apiFetch('/api/farmer/demand-intelligence');
  },

  /**
   * GET /api/mandi/prices
   * Returns: Government Mandi market prices via FastAPI backend proxy.
   */
  async getMandiPrices({ commodity = '', state = '', district = '', date = '' } = {}) {
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    if (date) params.append('date', date);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/mandi/prices${queryString}`);
  },
};


export default farmerIntelligenceService;
