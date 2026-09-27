import { storageFacilities, farmerLocation } from '../data/storageData';
import { activeCropLot, marketsData } from '../data/mockData';
import { logisticsService } from './logisticsService';

export const storageService = {
  /**
   * Fetch all or filtered storage facilities
   */
  async getStorageFacilities(filters = {}) {
    let list = [...storageFacilities];

    if (filters.crop) {
      list = list.filter((s) =>
        s.supportedCrops.some((c) => c.toLowerCase().includes(filters.crop.toLowerCase()))
      );
    }

    if (filters.maxRadius) {
      list = list.filter((s) => s.distance <= filters.maxRadius);
    }

    if (filters.type && filters.type !== 'all') {
      list = list.filter((s) => s.type.toLowerCase() === filters.type.toLowerCase());
    }

    if (filters.verifiedOnly) {
      list = list.filter((s) => s.verified);
    }

    if (filters.temperatureControlled) {
      list = list.filter((s) => s.temperatureControlled);
    }

    return list;
  },

  async getStorageById(id) {
    return storageFacilities.find((s) => s.id === id) || null;
  },

  /**
   * Calculate cumulative storage fee
   */
  calculateStorageFee(pricePerKgPerDay, quantityKg, durationDays) {
    return Math.round(pricePerKgPerDay * quantityKg * durationDays);
  },

  /**
   * Core AI Store vs Sell Decision Algorithm
   *
   * Formulations:
   * sellNow = currentPrice * quantity - transportCost
   * storeLater = predictedFuturePrice * quantity - storageCost - transportCost
   */
  computeStoreVsSellDecision({
    cropLot = activeCropLot,
    selectedStorage = storageFacilities[1], // GMR Aero Cold Storage
    targetMandi = marketsData[0], // Bowenpally
    durationDays = 5,
    predictedPricePerKg = 33.0, // Expected peak price
    currentPricePerKg = 31.0,
  }) {
    const quantityKg = cropLot.quantityKg || 1000;

    // Transport directly from Farmer to Mandi
    const directFreight = logisticsService.estimateTransportCost(
      targetMandi.distance,
      quantityKg
    );
    const directTransportCost = directFreight.estimatedCost;

    // SELL NOW calculation
    const sellNowGross = currentPricePerKg * quantityKg;
    const sellNowNet = sellNowGross - directTransportCost;

    // STORE LATER calculation
    // Farm to Storage freight
    const farmToStorageFreight = logisticsService.estimateTransportCost(
      selectedStorage.distance,
      quantityKg
    );
    // Storage to Mandi freight (approximate based on distance delta)
    const storageToMandiDistance = Math.abs(targetMandi.distance - selectedStorage.distance) + 8;
    const storageToMandiFreight = logisticsService.estimateTransportCost(
      storageToMandiDistance,
      quantityKg
    );
    const totalStoreTransportCost = farmToStorageFreight.estimatedCost + storageToMandiFreight.estimatedCost;

    // Storage fee for duration
    const storageCost = Math.round(selectedStorage.pricePerKgPerDay * quantityKg * durationDays);

    // Gross at peak price
    const storeLaterGross = predictedPricePerKg * quantityKg;
    const storeLaterNet = storeLaterGross - storageCost - totalStoreTransportCost;

    const netDifference = storeLaterNet - sellNowNet;
    const isStoreRecommended = netDifference > 0 && selectedStorage.temperatureControlled;

    return {
      cropName: cropLot.cropName,
      quantityKg,
      durationDays,
      currentPricePerKg,
      predictedPricePerKg,
      // Sell Now details
      sellNow: {
        grossRevenue: sellNowGross,
        transportCost: directTransportCost,
        netRevenue: sellNowNet,
        netPerKg: (sellNowNet / quantityKg).toFixed(2),
      },
      // Store Later details
      storeLater: {
        grossRevenue: storeLaterGross,
        storageCost,
        storageRatePerKgPerDay: selectedStorage.pricePerKgPerDay,
        transportCost: totalStoreTransportCost,
        netRevenue: storeLaterNet,
        netPerKg: (storeLaterNet / quantityKg).toFixed(2),
        facilityName: selectedStorage.name,
      },
      // Comparison & AI Verdict
      verdict: isStoreRecommended ? 'STORE & SELL LATER' : 'SELL NOW',
      expectedAdditionalBenefit: Math.abs(netDifference),
      recommendedDurationDays: durationDays,
      aiConfidence: isStoreRecommended ? 84 : 89,
      keyFactors: isStoreRecommended
        ? [
            `Predicted price rises by ₹${(predictedPricePerKg - currentPricePerKg).toFixed(2)}/kg in ${durationDays} days.`,
            `Cold storage costs ₹${storageCost.toLocaleString()} (₹${selectedStorage.pricePerKgPerDay}/kg/day).`,
            `Net additional profit of ₹${netDifference.toLocaleString()} after freight and storage.`,
          ]
        : [
            `Transport overhead (₹${totalStoreTransportCost.toLocaleString()}) and storage fees reduce margin.`,
            `High perishability risk for tomatoes without immediate sub-4°C pre-cooling.`,
            `Current market price of ₹${currentPricePerKg}/kg at ${targetMandi.name} is strong right now.`,
          ],
    };
  },
};

export default storageService;
