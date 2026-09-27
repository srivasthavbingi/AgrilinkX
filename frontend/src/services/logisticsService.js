/**
 * Logistics and transport cost estimator service.
 * Ready for OSRM (Open Source Routing Machine) routing API & dynamic freight quotes.
 */
export const logisticsService = {
  /**
   * Great-circle distance between two coordinates in kilometers
   */
  getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Multiply by ~1.25 road winding factor compared to straight line
    return parseFloat((R * c * 1.25).toFixed(1));
  },

  /**
   * Estimate freight cost based on distance and load
   * Mini Truck (Tata Ace / Mahindra Bolero Maxx)
   */
  estimateTransportCost(distanceKm, weightKg = 1000, vehicleType = 'mini-truck') {
    let ratePerKm = 24;
    let baseCharge = 700;

    if (vehicleType === 'pickup') {
      ratePerKm = 28;
      baseCharge = 900;
    } else if (vehicleType === 'heavy-truck') {
      ratePerKm = 45;
      baseCharge = 2000;
    }

    const distanceCharge = Math.max(0, distanceKm - 10) * ratePerKm;
    const totalFreight = Math.round(baseCharge + distanceCharge);
    const durationMinutes = Math.round((distanceKm / 35) * 60); // avg speed 35 km/h

    return {
      distanceKm,
      vehicleType,
      baseCharge,
      distanceCharge,
      estimatedCost: totalFreight,
      costPerKg: (totalFreight / weightKg).toFixed(2),
      estimatedDurationMinutes: durationMinutes,
      durationFormatted:
        durationMinutes > 60
          ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
          : `${durationMinutes} min`,
    };
  },

  /**
   * Route planning helper between two locations.
   * Can be swapped directly with:
   * fetch(`https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson`)
   */
  getRoute(origin, destination, weightKg = 1000, vehicleType = 'mini-truck') {
    const distanceKm =
      destination.distance ||
      this.getDistanceKm(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );

    const logistics = this.estimateTransportCost(distanceKm, weightKg, vehicleType);

    // Generate smooth intermediate waypoints for Leaflet polyline
    const points = [
      [origin.latitude, origin.longitude],
      [
        origin.latitude + (destination.latitude - origin.latitude) * 0.35 + 0.008,
        origin.longitude + (destination.longitude - origin.longitude) * 0.35 - 0.005,
      ],
      [
        origin.latitude + (destination.latitude - origin.latitude) * 0.7 - 0.005,
        origin.longitude + (destination.longitude - origin.longitude) * 0.7 + 0.006,
      ],
      [destination.latitude, destination.longitude],
    ];

    return {
      originName: origin.name,
      destinationName: destination.name,
      distanceKm,
      estimatedCost: logistics.estimatedCost,
      estimatedDuration: logistics.durationFormatted,
      costPerKg: logistics.costPerKg,
      coordinates: points,
    };
  },
};

export default logisticsService;
