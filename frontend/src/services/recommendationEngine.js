import { farmerListings } from '../data/farmerListings';
import { productMatching } from './productMatching';
import { locationService } from './locationService';
import { inventoryService } from './inventoryService';

/**
 * ML-ready Local Recommendation Engine for AgriLinkX Consumer Experience.
 * Connects local families directly to nearby farmers for everyday small-quantity produce.
 */
export const recommendationEngine = {
  /**
   * Main recommendation entrypoint with dynamic search radius expansion.
   */
  findRecommendations(userRequirement, customInventory = null) {
    const {
      product: rawQuery = 'Tomato',
      quantity = 1,
      unit = 'kg',
      preference = 'Nearest',
      latitude = locationService.getCurrentLocation().latitude,
      longitude = locationService.getCurrentLocation().longitude,
    } = userRequirement;

    // Retrieve active inventory list (custom, or from inventoryService sync store)
    const activeSource = customInventory || farmerListings;

    // 1. Semantic parsing of query & origin
    const parsedQuery = productMatching.parseUserQuery(rawQuery);
    const targetProduct = parsedQuery.product;

    // 2. Dynamic Search Radius Expansion sequence
    const radiusTiers = [2, 5, 10, 25, 50];
    let matchingListings = [];
    let finalRadius = 2;
    const searchProgression = [];

    for (let i = 0; i < radiusTiers.length; i++) {
      const radius = radiusTiers[i];
      finalRadius = radius;

      searchProgression.push({
        radius,
        status: `Searching farmers within ${radius} km...`,
      });

      // Filter listings within this radius where product matches & quantity > 0 & status != 'Unavailable'
      const candidates = activeSource
        .map((listing) => {
          const distanceKm = locationService.calculateDistance(
            latitude,
            longitude,
            listing.latitude,
            listing.longitude
          );
          return { ...listing, distance: distanceKm };
        })
        .filter((listing) => {
          // EXCLUDE UNAVAILABLE INVENTORY (Requirement 8)
          if (listing.availabilityStatus === 'Unavailable' || listing.quantityAvailable <= 0) {
            return false;
          }

          const isWithinRadius = listing.distance <= radius;
          const matchScore = productMatching.calculateMatchScore(parsedQuery, listing);
          return isWithinRadius && matchScore > 0;
        });

      if (candidates.length > 0) {
        // Found suitable results at this radius
        matchingListings = candidates;
        searchProgression.push({
          radius,
          success: true,
          status: `${candidates.length} suitable ${candidates.length === 1 ? 'farmer' : 'farmers'} found within ${radius} km.`,
        });
        break;
      } else {
        searchProgression.push({
          radius,
          success: false,
          status: `No suitable ${targetProduct || 'product'} available within ${radius} km. Expanding radius...`,
        });
      }
    }

    // Fallback if none found in 50 km: return all candidates regardless of radius
    if (matchingListings.length === 0) {
      matchingListings = farmerListings
        .map((listing) => {
          const distanceKm = locationService.calculateDistance(
            latitude,
            longitude,
            listing.latitude,
            listing.longitude
          );
          return { ...listing, distance: distanceKm };
        })
        .filter((listing) => productMatching.calculateMatchScore(parsedQuery, listing) > 0);
    }

    // 3. Score every candidate using the hybrid multi-factor scoring formula
    const scoredListings = matchingListings.map((listing) => {
      const scoreBreakdown = this.calculateRecommendationScore(
        parsedQuery,
        listing,
        quantity,
        finalRadius,
        preference
      );
      return {
        ...listing,
        recommendationScore: scoreBreakdown.totalScore,
        scoreBreakdown,
        isPartialMatch: scoreBreakdown.isPartialMatch,
        isBelowMinOrder: scoreBreakdown.isBelowMinOrder,
      };
    });

    // Sort by recommendationScore descending
    scoredListings.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Populate data-backed recommendation reasons for each scored listing
    scoredListings.forEach((listing) => {
      listing.reasons = this.getRecommendationReasons(listing, quantity, unit, scoredListings, parsedQuery);
    });

    // 4. Determine tiered awards: Best Match, Nearby Alternative, Best Price
    const bestMatch = scoredListings[0] || null;

    const availableItems = scoredListings.filter((item) => !item.isPartialMatch && !item.isBelowMinOrder);
    const pool = availableItems.length > 0 ? availableItems : scoredListings;

    // Safe extraction helpers for price and distance
    const getValidDistance = (item) => {
      if (!item) return Infinity;
      const d = item.distance;
      const num = Number(d);
      return !isNaN(num) && num >= 0 ? num : Infinity;
    };

    const getValidPrice = (item) => {
      if (!item) return Infinity;
      const p = item.price ?? item.price_per_unit;
      const num = Number(p);
      return !isNaN(num) && num >= 0 ? num : Infinity;
    };

    // Smallest valid distance in pool
    const validDistanceItems = [...pool].filter((item) => getValidDistance(item) < Infinity);
    validDistanceItems.sort((a, b) => getValidDistance(a) - getValidDistance(b));
    const minDistance = validDistanceItems[0] ? getValidDistance(validDistanceItems[0]) : Infinity;

    const nearbyAlternative =
      validDistanceItems.find((item) => (!bestMatch || item.id !== bestMatch.id) && getValidDistance(item) === minDistance) ||
      validDistanceItems.find((item) => !bestMatch || item.id !== bestMatch.id) ||
      null;

    // Absolute lowest valid price among displayed matching listings
    const validPriceItems = [...pool].filter((item) => getValidPrice(item) < Infinity);
    validPriceItems.sort((a, b) => getValidPrice(a) - getValidPrice(b));
    const minPrice = validPriceItems[0] ? getValidPrice(validPriceItems[0]) : Infinity;

    // Best Price MUST correspond strictly to the lowest valid price (minPrice)
    let bestPrice = null;
    if (minPrice < Infinity) {
      const distinctMinPriceItem = validPriceItems.find(
        (item) =>
          getValidPrice(item) === minPrice &&
          (!bestMatch || item.id !== bestMatch.id) &&
          (!nearbyAlternative || item.id !== nearbyAlternative.id)
      );
      if (distinctMinPriceItem) {
        bestPrice = distinctMinPriceItem;
      }
    }

    return {
      query: rawQuery,
      parsedQuery,
      requestedQuantity: quantity,
      requestedUnit: unit,
      finalRadius,
      searchProgression,
      totalMatches: scoredListings.length,
      allResults: scoredListings,
      tiered: {
        bestMatch,
        nearbyAlternative,
        bestPrice,
      },
    };
  },

  /**
   * Multi-Factor Hybrid Scoring Algorithm
   *
   * Normalized Weights:
   * 30% Distance
   * 25% Availability (Quantity & Min Order)
   * 20% Product Match
   * 10% Quality
   * 10% Price
   * 5% Farmer Reliability
   * + Explicit Origin Bonus / Penalty
   */
  calculateRecommendationScore(parsedQuery, listing, requestedQuantity, maxRadius, preference) {
    // A. Distance Score (0 - 100): closer is better
    const effectiveRadius = Math.max(maxRadius, 5);
    const distanceRatio = Math.min(1, listing.distance / effectiveRadius);
    const distanceScore = Math.max(10, Math.round((1 - distanceRatio) * 100));

    // B. Availability Score (0 - 100):
    let availabilityScore = 100;
    let isPartialMatch = false;
    let isBelowMinOrder = false;

    if (requestedQuantity < listing.minimumOrder) {
      isBelowMinOrder = true;
      availabilityScore = 20; // Severe penalty: user wants 1 kg but farmer min order is 5 kg
    } else if (listing.quantityAvailable < requestedQuantity) {
      isPartialMatch = true;
      availabilityScore = Math.round((listing.quantityAvailable / requestedQuantity) * 50);
    } else {
      availabilityScore = 100;
    }

    // C. Product Match Score (0 - 100)
    const productMatchScore = productMatching.calculateMatchScore(parsedQuery, listing);

    // D. Quality Score (0 - 100)
    let qualityScore = 80;
    if (listing.quality === 'Grade A+') qualityScore = 100;
    else if (listing.quality === 'Grade A') qualityScore = 90;
    else if (listing.quality === 'Grade B') qualityScore = 70;
    else if (listing.quality === 'Grade C') qualityScore = 50;

    // E. Freshness Score (0 - 100)
    let freshnessScore = 80;
    if (listing.harvestDate) {
      const today = new Date('2026-09-13');
      const harvest = new Date(listing.harvestDate);
      const daysDiff = Math.max(0, Math.round((today - harvest) / (1000 * 60 * 60 * 24)));
      if (daysDiff === 0) freshnessScore = 100; // Harvested today
      else if (daysDiff === 1) freshnessScore = 90;
      else if (daysDiff <= 3) freshnessScore = 75;
      else freshnessScore = 60;
    }

    // F. Price Score (0 - 100): lower price per unit scores higher
    let priceScore = 75;
    if (listing.price <= 30) priceScore = 95;
    else if (listing.price <= 60) priceScore = 85;
    else if (listing.price <= 150) priceScore = 75;
    else priceScore = 65;

    // G. Farmer Reliability Score (0 - 100)
    const reliabilityScore = Math.round(
      ((listing.rating || 4.0) / 5) * 75 + (listing.verified ? 25 : 0)
    );

    // Standard weights:
    let wDistance = 0.30;
    let wAvailability = 0.25;
    let wProduct = 0.20;
    let wQuality = 0.10;
    let wPrice = 0.10;
    let wReliability = 0.05;

    // Adjust weights based on user preference toggle
    if (preference === 'Nearest') {
      wDistance = 0.45;
      wPrice = 0.05;
    } else if (preference === 'Freshest') {
      wQuality = 0.20;
      wDistance = 0.20;
    } else if (preference === 'Best Price') {
      wPrice = 0.30;
      wDistance = 0.15;
    } else if (preference === 'Direct from Farmer') {
      wReliability = 0.15;
      wQuality = 0.15;
    }

    let rawScore =
      distanceScore * wDistance +
      availabilityScore * wAvailability +
      productMatchScore * wProduct +
      qualityScore * wQuality +
      priceScore * wPrice +
      reliabilityScore * wReliability;

    // H. ORIGIN-AWARE INTELLIGENCE BOOST / PENALTY
    // If user explicitly searched "Assam tea", Assam origin gets +35 bonus; generic/unknown gets -25 penalty
    let originBonus = 0;
    if (parsedQuery.hasExplicitOrigin && parsedQuery.preferredOrigin) {
      const queryOriginLower = parsedQuery.preferredOrigin.toLowerCase();
      const listingOriginLower = (listing.origin || '').toLowerCase();

      if (listingOriginLower.includes(queryOriginLower)) {
        originBonus = +35; // Huge bonus for authentic origin match!
      } else {
        originBonus = -25; // Penalty for mismatch or generic origin
      }
    }

    const totalScore = Math.min(99, Math.max(15, Math.round(rawScore + originBonus)));

    return {
      totalScore,
      distanceScore,
      availabilityScore,
      productMatchScore,
      qualityScore,
      freshnessScore,
      priceScore,
      reliabilityScore,
      originBonus,
      isPartialMatch,
      isBelowMinOrder,
    };
  },

  /**
   * Safe unit conversion for quantity matching comparison.
   */
  normalizeQuantity(requestedQuantity, requestedUnit, targetUnit) {
    const reqQty = Number(requestedQuantity) || 0;
    const reqU = (requestedUnit || 'kg').toLowerCase();
    const tarU = (targetUnit || 'kg').toLowerCase();

    if (reqU === tarU) return reqQty;
    if (reqU === 'g' && tarU === 'kg') return reqQty / 1000;
    if (reqU === 'kg' && tarU === 'g') return reqQty * 1000;
    if (reqU === 'ml' && tarU === 'l') return reqQty / 1000;
    if (reqU === 'l' && tarU === 'ml') return reqQty * 1000;
    return reqQty;
  },

  /**
   * Generate data-backed recommendation reasons based on actual listing properties.
   */
  getRecommendationReasons(listing, requestedQuantity = 1, requestedUnit = 'kg', allResults = [], parsedQuery = {}) {
    if (!listing) return [];
    const reasons = [];

    const normReqQty = this.normalizeQuantity(requestedQuantity, requestedUnit, listing.unit);

    // 1. Distance reason
    const validDistances = (allResults || [])
      .map((r) => Number(r.distance))
      .filter((d) => !isNaN(d) && d >= 0);
    const minDist = validDistances.length > 0 ? Math.min(...validDistances) : Infinity;

    if (typeof listing.distance === 'number' && listing.distance >= 0 && listing.distance <= minDist + 0.1) {
      reasons.push({ icon: '📍', text: `Closest matching farmer (${listing.distance} km away)` });
    } else if (typeof listing.distance === 'number' && listing.distance >= 0 && listing.distance <= 5) {
      reasons.push({ icon: '📍', text: `Nearby location (${listing.distance} km away)` });
    }

    // 2. Price reason
    const validPrices = (allResults || [])
      .map((r) => Number(r.price ?? r.price_per_unit))
      .filter((p) => !isNaN(p) && p >= 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : Infinity;
    const itemPrice = Number(listing.price ?? listing.price_per_unit);

    if (!isNaN(itemPrice) && itemPrice === minPrice) {
      reasons.push({ icon: '💰', text: `Best price nearby (₹${itemPrice}/${listing.unit || 'kg'})` });
    } else if (!isNaN(itemPrice) && minPrice < Infinity && itemPrice <= minPrice * 1.15) {
      reasons.push({ icon: '💰', text: `Competitive price (₹${itemPrice}/${listing.unit || 'kg'})` });
    }

    // 3. Available Quantity reason
    const qtyAvail = Number(listing.quantityAvailable ?? listing.quantity_available ?? 0);
    if (qtyAvail >= normReqQty && normReqQty > 0) {
      reasons.push({ icon: '📦', text: `Enough quantity available (${qtyAvail} ${listing.unit || 'kg'} in stock)` });
    }

    // 4. Rating & Verification reason
    const rating = Number(listing.rating || 0);
    if (rating >= 4.7 || listing.verified) {
      reasons.push({ icon: '⭐', text: `High-rated producer (${rating > 0 ? rating + '★ ' : ''}${listing.verified ? 'Verified ✓' : ''})` });
    }

    // 5. Freshness reason
    const harvest = listing.harvestDate || listing.harvest_date;
    if (harvest === '2026-09-13' || harvest === '2026-09-15' || listing.quality === 'Grade A+' || listing.quality === 'Grade A') {
      reasons.push({ icon: '🌱', text: `Fresh produce (${listing.quality || 'Grade A'} standard)` });
    }

    // 6. Explicit Origin Match reason
    if (parsedQuery?.hasExplicitOrigin && parsedQuery?.preferredOrigin && listing.origin) {
      if (listing.origin.toLowerCase().includes(parsedQuery.preferredOrigin.toLowerCase())) {
        reasons.push({ icon: '🏆', text: `Matches requested origin (${parsedQuery.preferredOrigin})` });
      }
    }

    // 7. High overall match score
    const score = Number(listing.recommendationScore ?? listing.recommendation_score);
    if (!isNaN(score) && score >= 85) {
      reasons.push({ icon: '⚡', text: `High overall AI recommendation match (${score}%)` });
    }

    return reasons;
  },
};

export default recommendationEngine;
