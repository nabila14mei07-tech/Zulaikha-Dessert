/**
 * Zulaikha Premium Dessert — Shared Product Data
 * Kategori: donut, cheesequit, pudding
 */

const STORAGE_KEY_PRODUCTS = "zulaikha_products_v1";

const DEFAULT_PRODUCTS = [
  { id: 1, nama: "Choco Regal Dessert", kategori: "donut", harga: 35000, stok: 10,
    img: "assets/choco-regal.jpeg", desc: "Dessert cokelat premium dengan lapisan biskuit Regal renyah.",
    varianRasa: [1, 2, 3], varianToping: [1, 2, 3], varianPorsi: [1, 2, 3],
    hargaPorsi: { 1: 25000, 2: 35000, 3: 48000 } },
  { id: 2, nama: "Dessert Lotus", kategori: "donut", harga: 38000, stok: 8,
    img: "assets/lotus.jpeg", desc: "Dessert lembut dengan saus Lotus Biscoff khas yang legit.",
    varianRasa: [1, 2, 3, 4], varianToping: [1, 2, 4], varianPorsi: [1, 2, 3],
    hargaPorsi: { 1: 28000, 2: 38000, 3: 52000 } },
  { id: 3, nama: "Donat Kukus Lumer", kategori: "donut", harga: 25000, stok: 0,
    img: "assets/donat-lumer.jpeg", desc: "Donat kukus lembut dengan topping cokelat lumer.",
    varianRasa: [1, 3, 4], varianToping: [1, 2], varianPorsi: [1, 2],
    hargaPorsi: { 1: 20000, 2: 28000 } },
  { id: 4, nama: "Produk Spesial 1", kategori: "cheesequit", harga: 30000, stok: 15,
    img: "assets/produk1.jpeg", desc: "Menu spesial Zulaikha — dibuat fresh setiap hari.",
    varianRasa: [1, 2, 3, 4, 5], varianToping: [1, 2, 3, 4], varianPorsi: [1, 2],
    hargaPorsi: { 1: 25000, 2: 30000 } },
  { id: 5, nama: "Produk Spesial 2", kategori: "cheesequit", harga: 32000, stok: 12,
    img: "assets/produk 2.jpeg", desc: "Varian dessert pilihan dengan rasa premium.",
    varianRasa: [1, 3, 5], varianToping: [1, 4], varianPorsi: [1, 2, 3],
    hargaPorsi: { 1: 24000, 2: 32000, 3: 42000 } },
  { id: 6, nama: "Produk Spesial 3", kategori: "cheesequit", harga: 28000, stok: 5,
    img: "assets/produk 3.jpeg", desc: "Salah satu favorit pelanggan Zulaikha Dessert.",
    varianRasa: [1, 2], varianToping: [2, 3], varianPorsi: [1],
    hargaPorsi: { 1: 25000 } },
  { id: 7, nama: "Pudding Mangga Creamy", kategori: "pudding", harga: 22000, stok: 20,
    img: "assets/pudding-mangga.jpeg", desc: "Pudding mangga segar dengan saus cream lembut.",
    varianRasa: [3, 4], varianToping: [2], varianPorsi: [1, 2],
    hargaPorsi: { 1: 18000, 2: 24000 } },
  { id: 8, nama: "Pudding Silverqueen", kategori: "pudding", harga: 28000, stok: 0,
    img: "assets/pudding-silverqueen.jpeg", desc: "Pudding cokelat Silverqueen premium, creamy & manis pas.",
    varianRasa: [1, 2], varianToping: [1, 2, 4], varianPorsi: [1, 2],
    hargaPorsi: { 1: 22000, 2: 29000 } },
  { id: 9, nama: "Tiramisu Classic", kategori: "donut", harga: 45000, stok: 6,
    img: "assets/tiramisu.jpeg", desc: "Tiramisu klasik ala Italia dengan kopi & mascarpone.",
    varianRasa: [2, 5], varianToping: [1, 2], varianPorsi: [2, 3],
    hargaPorsi: { 2: 45000, 3: 58000 } },
];

const CATEGORY_LABEL = { donut: "Donut Kukus", cheesequit: "Cheesequit", pudding: "Pudding" };

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
      return [...DEFAULT_PRODUCTS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
      return [...DEFAULT_PRODUCTS];
    }
    return parsed.map((p) => {
      const varianPorsi = Array.isArray(p.varianPorsi) ? p.varianPorsi : [];
      let hargaPorsi = (p.hargaPorsi && typeof p.hargaPorsi === "object") ? p.hargaPorsi : {};
      if (Object.keys(hargaPorsi).length === 0) {
        varianPorsi.forEach((pid) => { hargaPorsi[pid] = p.harga || 0; });
      }
      return {
        ...p,
        varianRasa: Array.isArray(p.varianRasa) ? p.varianRasa : [],
        varianToping: Array.isArray(p.varianToping) ? p.varianToping : [],
        varianPorsi,
        hargaPorsi,
      };
    });
  } catch {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
}

function saveProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    return true;
  } catch (e) { console.error("Gagal simpan produk:", e); return false; }
}

function getNextId(products) {
  return products.length === 0 ? 1 : Math.max(...products.map((p) => p.id)) + 1;
}

window.ZDProducts = {
  loadProducts,
  saveProducts,
  getNextId,
  getProductPrice: function (product, porsiId) {
    if (!product) return 0;
    if (product.hargaPorsi && porsiId && product.hargaPorsi[porsiId] !== undefined) {
      return product.hargaPorsi[porsiId];
    }
    return product.harga;
  },
  DEFAULT_PRODUCTS,
  CATEGORY_LABEL,
  STORAGE_KEY_PRODUCTS,
};
