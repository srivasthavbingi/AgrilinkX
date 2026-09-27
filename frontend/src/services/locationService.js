// Location & Distance calculation service for Consumer experience

export const locationPresets = [
  {
    id: "loc-banjara",
    label: "Banjara Hills, Hyderabad (Default)",
    area: "Road No. 12, Banjara Hills",
    latitude: 17.4156,
    longitude: 78.4350,
  },
  {
    id: "loc-hitec",
    label: "Hitec City / Madhapur",
    area: "Cyber Towers, Madhapur",
    latitude: 17.4504,
    longitude: 78.3808,
  },
  {
    id: "loc-secunderabad",
    label: "Secunderabad",
    area: "Clock Tower, Secunderabad",
    latitude: 17.4399,
    longitude: 78.4983,
  },
  {
    id: "loc-shamshabad",
    label: "Shamshabad",
    area: "Airport Corridor, Shamshabad",
    latitude: 17.2510,
    longitude: 78.4320,
  },
];

class LocationService {
  constructor() {
    this.currentLocation = locationPresets[0];
  }

  getCurrentLocation() {
    return this.currentLocation;
  }

  setCurrentLocation(presetOrCoords) {
    if (typeof presetOrCoords === 'string') {
      const found = locationPresets.find((p) => p.id === presetOrCoords);
      if (found) this.currentLocation = found;
    } else if (presetOrCoords && presetOrCoords.latitude && presetOrCoords.longitude) {
      this.currentLocation = presetOrCoords;
    }
    return this.currentLocation;
  }

  /**
   * Calculate Haversine distance between two coordinates in km
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
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
    return parseFloat((R * c).toFixed(1));
  }
}

export const locationService = new LocationService();
export default locationService;
