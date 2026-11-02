/**
 * Zulaikha Premium Dessert — Order Tracking
 */

const STORAGE_KEY_ORDERS = "zulaikha_orders_v1";

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    return true;
  } catch (e) { console.error("Gagal simpan orders:", e); return false; }
}

function generateOrderId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  return `ZD-${ts}-${rand}`;
}

function addOrder(order) {
  const orders = loadOrders();
  orders.unshift(order);
  return saveOrders(orders);
}

function updateOrderStatus(orderId, newStatus) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = newStatus;
  return saveOrders(orders);
}

function getOrder(orderId) {
  return loadOrders().find((o) => o.id === orderId);
}

window.ZDOrders = {
  loadOrders, saveOrders, addOrder, updateOrderStatus, getOrder, generateOrderId, STORAGE_KEY_ORDERS,
};
