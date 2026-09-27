import { supabase } from './supabaseClient';
import { farmerListings } from '../data/farmerListings';

// In-memory active inventory store initialized from farmerListings for hackathon fallback
let localInventory = [...farmerListings];

// Event listeners for real-time reactive UI updates
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((callback) => callback(localInventory));
};

export const inventoryService = {
  /**
   * Subscribe to inventory changes (adds, edits, stock deductions)
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /**
   * Get all active products (combining Supabase or Fallback)
   */
  async getAllProducts() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('farmer_products').select('*');
        if (!error && data && data.length > 0) {
          return data.map((item) => this.mapFromSupabase(item));
        }
      } catch (err) {
        console.warn('Supabase fetch unavailable, using local inventory fallback:', err.message);
      }
    }
    return localInventory.filter((item) => item.availabilityStatus !== 'Unavailable');
  },

  /**
   * Get products by a specific farmer ID or user ID
   */
  async getFarmerProducts(farmerId = 'F001', userId = null) {
    if (supabase) {
      try {
        let query = supabase.from('farmer_products').select('*');
        if (userId && farmerId && farmerId !== 'F001') {
          query = query.or(`farmer_id.eq.${farmerId},user_id.eq.${userId}`);
        } else if (farmerId && farmerId !== 'F001') {
          query = query.or(`farmer_id.eq.${farmerId},user_id.eq.${farmerId}`);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((item) => this.mapFromSupabase(item));
        }
      } catch (err) {
        // Fallback to local below
      }
    }
    return localInventory.filter((item) => item.farmerId === farmerId || item.userId === userId || item.farmer_id === farmerId);
  },

  /**
   * Add a new product listing by farmer
   */
  async addFarmerProduct(newProduct) {
    const generatedId = `L${Date.now()}`;
    const formatted = {
      id: generatedId,
      farmerId: newProduct.farmerId || 'F001',
      userId: newProduct.userId || null,
      farmerName: newProduct.farmerName || 'Ravi Farms',
      product: newProduct.product || 'Tomato',
      category: newProduct.category || 'Vegetables',
      variety: newProduct.variety || 'Hybrid Red',
      quantityAvailable: Number(newProduct.quantity) || 10,
      unit: newProduct.unit || 'kg',
      price: Number(newProduct.price) || 28,
      quality: newProduct.quality || 'Grade A',
      harvestDate: newProduct.harvestDate || new Date().toISOString().split('T')[0],
      origin: newProduct.origin || 'Telangana',
      latitude: newProduct.latitude || 17.4210,
      longitude: newProduct.longitude || 78.4420,
      rating: 4.8,
      verified: true,
      availabilityStatus: Number(newProduct.quantity) > 0 ? 'Available' : 'Unavailable',
      deliveryAvailable: newProduct.deliveryAvailable ?? true,
      minimumOrder: Number(newProduct.minimumOrder) || 1,
      description: newProduct.description || 'Freshly picked farm produce.',
      badges: ['Harvested Today', 'Direct from Farm'],
    };

    // Try Supabase insert (guard against null client)
    if (supabase) {
      try {
        let resolvedFarmerId = newProduct.farmerId;
        if (newProduct.userId && (!resolvedFarmerId || resolvedFarmerId === 'F001')) {
          const { data: fData } = await supabase.from('farmers').select('id').eq('user_id', newProduct.userId).maybeSingle();
          if (fData?.id) resolvedFarmerId = fData.id;
        }

        const supabaseRow = {
            id: formatted.id,
            farmer_id: resolvedFarmerId && resolvedFarmerId !== 'F001' ? resolvedFarmerId : null,
            product: formatted.product,
            category: formatted.category,
            variety: formatted.variety,
            quantity_available: formatted.quantityAvailable,
            unit: formatted.unit,
            price: formatted.price,
            quality: formatted.quality,
            harvest_date: formatted.harvestDate,
            origin: formatted.origin,
            latitude: formatted.latitude,
            longitude: formatted.longitude,
            minimum_order: formatted.minimumOrder,
            delivery_available: formatted.deliveryAvailable,
            availability_status: formatted.availabilityStatus,
            description: formatted.description,
        };
        if (!supabaseRow.farmer_id) delete supabaseRow.farmer_id;
        if (newProduct.userId) supabaseRow.user_id = newProduct.userId;
        const { error } = await supabase.from('farmer_products').insert([supabaseRow]);
        if (error) console.warn('Supabase insert note:', error.message);
      } catch (e) {
        // Fallback handles it below
      }
    }

    // Always update local inventory store
    localInventory.unshift(formatted);
    notifyListeners();
    return formatted;
  },

  /**
   * Update existing product details
   */
  async updateFarmerProduct(id, updates) {
    if (supabase) {
      try {
        await supabase
          .from('farmer_products')
          .update({
            product: updates.product,
            price: updates.price,
            quality: updates.quality,
            variety: updates.variety,
          })
          .eq('id', id);
      } catch (e) {}
    }

    localInventory = localInventory.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    notifyListeners();
    return localInventory.find((item) => item.id === id);
  },

  /**
   * Update quantity available for a product
   */
  async updateQuantity(id, newQuantity) {
    const qtyNum = Math.max(0, Number(newQuantity));
    const newStatus = qtyNum === 0 ? 'Unavailable' : 'Available';

    if (supabase) {
      try {
        await supabase
          .from('farmer_products')
          .update({
            quantity_available: qtyNum,
            availability_status: newStatus,
          })
          .eq('id', id);
      } catch (e) {}
    }

    localInventory = localInventory.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          quantityAvailable: qtyNum,
          availabilityStatus: newStatus,
        };
      }
      return item;
    });
    notifyListeners();
    return localInventory.find((item) => item.id === id);
  },

  /**
   * Mark a product as Unavailable
   */
  async markProductUnavailable(id) {
    return this.updateQuantity(id, 0);
  },

  /**
   * Decrement available quantity when an order is placed (e.g. 10 kg → 9 kg)
   */
  async decrementQuantity(id, buyQuantity) {
    const item = localInventory.find((i) => i.id === id);
    if (!item) return null;

    const remaining = Math.max(0, item.quantityAvailable - Number(buyQuantity));
    return this.updateQuantity(id, remaining);
  },

  /**
   * Helper to map DB row keys to JS camelCase
   */
  mapFromSupabase(row) {
    return {
      id: row.id,
      farmerId: row.farmer_id,
      farmerName: row.farmer_name || 'Farmer Producer',
      product: row.product,
      category: row.category,
      variety: row.variety,
      quantityAvailable: row.quantity_available,
      unit: row.unit,
      price: row.price,
      quality: row.quality,
      harvestDate: row.harvest_date,
      origin: row.origin,
      latitude: row.latitude || 17.4210,
      longitude: row.longitude || 78.4420,
      rating: 4.8,
      verified: true,
      availabilityStatus: row.availability_status,
      deliveryAvailable: row.delivery_available,
      minimumOrder: row.minimum_order,
      description: row.description,
    };
  },

  /**
   * Reset local inventory to initial mock state (useful for test cases)
   */
  resetToMock() {
    localInventory = [...farmerListings];
    notifyListeners();
  },
};

export default inventoryService;
