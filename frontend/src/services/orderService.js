import { inventoryService } from './inventoryService';
import { api } from './api';

const STATUS_MAP = {
  PLACED: 0,
  Placed: 0,
  ACCEPTED: 1,
  Accepted: 1,
  PREPARING: 2,
  Preparing: 2,
  READY: 3,
  Ready: 3,
  OUT_FOR_DELIVERY: 3,
  'Out for Delivery': 3,
  DELIVERED: 4,
  Delivered: 4,
  Completed: 4,
  CANCELLED: 5,
  Cancelled: 5,
};

const STAGES = ['PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

class OrderService {
  constructor() {
    this.orders = [];
  }

  getOrders() {
    return this.orders;
  }

  getOrderById(id) {
    return this.orders.find((o) => o.id === id) || null;
  }

  async fetchOrderById(id) {
    try {
      const apiOrder = await api.getOrder(id);
      if (apiOrder) {
        const normalized = this.normalizeApiOrder(apiOrder);
        this.upsertLocalOrder(normalized);
        return normalized;
      }
    } catch {
      // Fallback to local cache
    }
    return this.getOrderById(id);
  }

  getFarmerOrders(farmerId = 'F001') {
    return this.orders.filter((o) => o.farmerId === farmerId || o.farmer_id === farmerId || !farmerId);
  }

  async fetchOrders() {
    try {
      const apiOrders = await api.getOrders();
      if (Array.isArray(apiOrders)) {
        const normalized = apiOrders.map((o) => this.normalizeApiOrder(o));
        normalized.forEach((o) => this.upsertLocalOrder(o));
        return this.orders;
      }
    } catch (err) {
      console.warn('[OrderService] Fetch orders API note:', err.message);
    }
    return this.orders;
  }

  async fetchFarmerOrders(farmerId = 'F001') {
    try {
      const apiOrders = await api.getOrders(farmerId);
      if (Array.isArray(apiOrders)) {
        const normalized = apiOrders.map((o) => this.normalizeApiOrder(o));
        normalized.forEach((o) => this.upsertLocalOrder(o));
      }
    } catch (err) {
      console.warn('[OrderService] Fetch farmer orders API note:', err.message);
    }
    return this.getFarmerOrders(farmerId);
  }

  normalizeApiOrder(o) {
    const rawStatus = (o.status || o.statusText || 'PLACED').toUpperCase();
    const mapIdx = STATUS_MAP[rawStatus] !== undefined ? STATUS_MAP[rawStatus] : 0;

    return {
      id: o.id,
      productId: o.product_id || o.productId || '',
      productName: o.product_name || o.productName || o.product_id || 'Fresh Harvest',
      farmerId: o.farmer_id || o.farmerId || 'F001',
      farmerName: o.farmer_name || o.farmerName || 'Farmer Producer',
      farmerPhone: o.farmerPhone || '+91 98480 11221',
      customerName: o.customer_name || o.customerName || 'Local Family Customer',
      farmerLocation: o.farmerLocation || o.origin || 'Telangana Cluster',
      quantity: Number(o.quantity) || 1,
      unit: o.unit || 'kg',
      pricePerUnit: Number(o.price_per_unit || o.pricePerUnit) || 0,
      itemTotal: Math.round((Number(o.price_per_unit || o.pricePerUnit) || 0) * (Number(o.quantity) || 1)),
      deliveryFee: Number(o.deliveryFee) || (o.delivery_method === 'Farm Pickup' ? 0 : 20),
      totalAmount: Number(o.total_amount || o.totalAmount) || 0,
      deliveryType: o.delivery_method || o.deliveryType || 'Home Delivery',
      statusIndex: mapIdx,
      statusText: rawStatus,
      orderTime: o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : 'Recently',
      estimatedArrival: o.delivery_method === 'Farm Pickup' ? 'Ready for Farm Gate Pickup' : 'Within 45 minutes',
      paymentMethod: o.paymentMethod || 'UPI Escrow Deposit',
      paymentStatus: o.paymentStatus || 'Paid (Escrow Locked)',
    };
  }

  upsertLocalOrder(orderObj) {
    const idx = this.orders.findIndex((o) => o.id === orderObj.id);
    if (idx >= 0) {
      this.orders[idx] = { ...this.orders[idx], ...orderObj };
    } else {
      this.orders.unshift(orderObj);
    }
  }

  /**
   * Create a new order:
   * 1. Calls FastAPI /api/orders (validates stock, inserts DB, reduces inventory).
   * 2. If backend rejects (400 stock error), throws error immediately — NO order created, NO stock reduced!
   * 3. If API succeeds or offline fallback, updates local cache and returns order.
   */
  async createOrder({ listing, quantity = 1, deliveryType = 'Home Delivery', customerName = 'Sharma Family (Banjara Hills)' }) {
    const itemTotal = Math.round(listing.price * quantity);
    const deliveryFee = deliveryType === 'Farm Pickup' ? 0 : listing.deliveryFee || 20;
    const totalAmount = itemTotal + deliveryFee;

    const farmerId = listing.farmerId || listing.farmer_id || 'F001';
    const farmerName = listing.farmerName || listing.farmer_name || 'Ravi Farms';

    let apiOrder = null;
    let apiError = null;

    try {
      apiOrder = await api.createOrder({
        customer_name: customerName,
        farmer_id: farmerId,
        product_id: listing.id,
        quantity,
        unit: listing.unit || 'kg',
        price_per_unit: listing.price,
        total_amount: totalAmount,
        delivery_method: deliveryType,
      });
    } catch (err) {
      // If error is HTTP 400 or HTTP 404 validation failure from API, throw it directly!
      if (err.message.includes('400') || err.message.includes('Insufficient') || err.message.includes('unavailable')) {
        throw err;
      }
      apiError = err;
    }

    const orderId = apiOrder?.id || `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const localOrder = {
      id: orderId,
      productId: listing.id,
      productName: `${listing.product} (${listing.variety || 'Harvest'})`,
      farmerId,
      farmerName,
      farmerPhone: listing.phone || '+91 98480 11221',
      customerName,
      farmerLocation: `${listing.subDistrict || listing.origin || 'Local'} (${listing.distance || 1.2} km away)`,
      quantity,
      unit: listing.unit || 'kg',
      pricePerUnit: listing.price,
      itemTotal,
      deliveryFee,
      totalAmount,
      deliveryType,
      statusIndex: 0,
      statusText: 'PLACED',
      orderTime: 'Just now',
      estimatedArrival: deliveryType === 'Farm Pickup' ? 'Ready in 30 mins' : 'Within 45 minutes',
      paymentMethod: 'UPI / Escrow (Simulated)',
      paymentStatus: 'Escrow Locked',
    };

    this.upsertLocalOrder(localOrder);

    // Reconcile local inventory cache to reflect current stock after authoritative backend reduction.
    // POST /api/orders already performed the authoritative stock reduction on backend/Supabase.
    if (!apiOrder) {
      // Only decrement local fallback state if API call was offline
      inventoryService.decrementQuantity(listing.id, quantity);
    } else {
      // Sync local inventory item to exact remaining stock without double decrement
      const currentAvail = Number(listing.quantityAvailable ?? listing.quantity_available ?? quantity);
      const remaining = Math.max(0, currentAvail - quantity);
      inventoryService.updateQuantity(listing.id, remaining).catch(() => {});
    }

    return localOrder;
  }

  async updateOrderStatus(orderId, statusText) {
    const normStatus = (statusText || '').toUpperCase().replace(/\s+/g, '_');

    // Call FastAPI backend
    try {
      const updatedApi = await api.updateOrderStatus(orderId, normStatus);
      if (updatedApi) {
        const norm = this.normalizeApiOrder(updatedApi);
        this.upsertLocalOrder(norm);
        return norm;
      }
    } catch (err) {
      if (err.message.includes('400') || err.message.includes('Invalid status transition')) {
        throw err;
      }
    }

    // Local update fallback
    const local = this.getOrderById(orderId);
    if (local) {
      local.statusText = normStatus;
      local.statusIndex = STATUS_MAP[normStatus] !== undefined ? STATUS_MAP[normStatus] : local.statusIndex;
      return local;
    }
    return null;
  }

  async advanceOrderStatus(orderId) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const sequence = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentNorm = (order.statusText || 'PLACED').toUpperCase().replace(/\s+/g, '_');
    const currIdx = sequence.indexOf(currentNorm);

    if (currIdx >= 0 && currIdx < sequence.length - 1) {
      const nextStatus = sequence[currIdx + 1];
      return this.updateOrderStatus(orderId, nextStatus);
    }
    return order;
  }
}

export const orderService = new OrderService();
export default orderService;
