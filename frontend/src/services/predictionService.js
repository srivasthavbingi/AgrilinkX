import { priceTrendData, marketDrivers, aiRecommendation } from '../data/mockData';

/**
 * Service to fetch ML-driven price predictions and market driver insights.
 * Ready for connection to Python ML microservice (Prophet / LightGBM / LSTM).
 */
export const predictionService = {
  async getPricePredictions(crop = 'Tomato', horizonDays = 7) {
    // In production: fetch(`${ML_API_BASE}/predict?crop=${crop}&days=${horizonDays}`)
    return {
      crop,
      horizonDays,
      currency: 'INR',
      unit: 'kg',
      trend: priceTrendData,
      currentPrice: 31.0,
      forecastPeakPrice: 33.0,
      forecastPeakDate: 'Sep 16',
      bestSellingAction: 'Sell within 48-72 hours',
    };
  },

  async getMarketDrivers() {
    return marketDrivers;
  },

  async getAiRecommendation() {
    return aiRecommendation;
  },
};

export default predictionService;
