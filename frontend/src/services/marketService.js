import { marketsData, activeCropLot } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Service to fetch and calculate mandi market data.
 * Designed for clean plug-in to FastAPI or Supabase / AGMARKNET API later.
 */
export const marketService = {
  // Get all mandis with computed real-time net realization for the active lot
  async getMarkets(cropName = activeCropLot.cropName, quantityKg = activeCropLot.quantityKg) {
    // In production: return await fetch(`${API_BASE_URL}/api/v1/markets?crop=${cropName}`).then(r => r.json());
    return marketsData.map((mkt) => {
      const gross = mkt.modalPrice * quantityKg;
      const net = gross - mkt.transportCost - mkt.handlingFee;
      return {
        ...mkt,
        computedGrossRevenue: gross,
        computedNetRealization: net,
        netPerKg: (net / quantityKg).toFixed(1),
      };
    });
  },

  async getMarketById(id) {
    const markets = await this.getMarkets();
    return markets.find((m) => m.id === id) || null;
  },

  calculateNetRealization(modalPrice, quantityKg, transportCost, handlingFee = 500) {
    const gross = modalPrice * quantityKg;
    const net = gross - transportCost - handlingFee;
    return {
      gross,
      net,
      netPerKg: (net / quantityKg).toFixed(2),
    };
  },

  /**
   * Fetch real government mandi market price data via FastAPI backend proxy.
   * GET /api/mandi/prices?commodity=...&state=...&district=...&date=...
   */
  async getMandiPrices({ commodity = '', state = '', district = '', date = '' } = {}) {
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (state) params.append('state', state);
    if (district) params.append('district', district);
    if (date) params.append('date', date);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/mandi/prices${queryString}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(detail.detail || `API error ${res.status}`);
    }
    return res.json();
  },

  /**
   * Fetch baseline ML price forecast.
   * GET /api/ml/price-forecast?commodity=...&state=...&market=...
   */
  async getPriceForecast({ commodity = 'Maize', state = 'Telangana', market = '' } = {}) {
    const params = new URLSearchParams();
    if (commodity) params.append('commodity', commodity);
    if (state) params.append('state', state);
    if (market) params.append('market', market);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/ml/price-forecast${queryString}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(detail.detail || `API error ${res.status}`);
    }
    return res.json();
  },
};


export default marketService;
