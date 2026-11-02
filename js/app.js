/**
 * Zulaikha Premium Dessert — Customer App
 * Cart + WhatsApp Checkout + Stock + Varian + Ulasan + Kritik Saran
 */

const BRAND = {
  nama: "Zulaikha Premium Dessert",
  tagline: "Handcrafted with love since 2019",
  waNumber: "6281240320419",
};

const STORAGE_KEY = "zulaikha_cart_v1";

let PRODUCTS = window.ZDProducts.loadProducts();
const CATEGORY_LABELS = window.ZDProducts.CATEGORY_LABEL;
const hitungHarga = window.ZDProducts.getProductPrice;
const ZV = window.ZDVariants;
const ZR = window.ZDReviews;

window.addEventListener("focus", () => {
  const latest = window.ZDProducts.loadProducts();
  if (JSON.stringify(latest) !== JSON.stringify(PRODUCTS)) {
    PRODUCTS = latest;
    renderProducts();
    renderCart();
    renderBadge();
  }
});

const state = { category: "all", query: "" };
let cart = [];
let activeProductModal = null;
let selectedRasa = [];
let selectedToping = [];
let selectedPorsi = null;
let selectedRating = 0;

const $ = (s) => document.querySelector(s);

const dom = {
  productGrid:   $("#productGrid"),
  emptyState:    $("#emptyState"),
  searchInput:   $("#searchInput"),
  filterButtons: $("#filterButtons"),
  cartToggle:    $("#cartToggle"),
  cartBadge:     $("#cartBadge"),
  cartPanel:     $("#cartPanel"),
  cartOverlay:   $("#cartOverlay"),
  cartBody:      $("#cartBody"),
  cartTotal:     $("#cartTotal"),
  cartClose:     $("#cartClose"),
  checkoutBtn:   $("#checkoutBtn"),
  toast:         $("#toast"),
};

const formatRupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const getProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));

function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => dom.toast.classList.remove("show"), 2000);
}

function isSoldOut(product) {
  return !product || product.stok <= 0;
}

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cart = Array.isArray(parsed) ? parsed : [];
  } catch { cart = []; }
}

function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
  catch (e) { console.warn("Gagal simpan cart:", e); }
}

function getFilteredProducts() {
  const q = state.query.toLowerCase().trim();
  return PRODUCTS.filter((p) => {
    const okCat = state.category === "all" || p.kategori === state.category;
    const okQuery = !q || p.nama.toLowerCase().includes(q);
    return okCat && okQuery;
  });
}

function renderProducts() {
  if (!dom.productGrid) return;
  const filtered = getFilteredProducts();
  if (dom.emptyState) dom.emptyState.hidden = filtered.length > 0;

  dom.productGrid.innerHTML = filtered.map((p, i) => {
    const soldOut = isSoldOut(p);
    const hasRasa   = (p.varianRasa || []).length > 0;
    const hasToping = (p.varianToping || []).length > 0;
    const hasPorsi  = (p.varianPorsi || []).length > 0;
    const hasVariant = hasRasa || hasToping || hasPorsi;

    let displayPrice = p.harga;
    if (hasPorsi) {
      const prices = p.varianPorsi.map((pid) => hitungHarga(p, pid)).filter((h) => h > 0);
      if (prices.length > 0) displayPrice = Math.min(...prices);
    }

    return `
      <article class="product-card ${soldOut ? 'sold-out' : ''}" data-id="${p.id}" tabindex="0"
               role="button" style="animation-delay:${i * 60}ms">
        <div class="product-img-wrap">
          <img src="${p.img}" alt="${p.nama}" loading="lazy" />
          ${soldOut ? '<span class="sold-out-badge">SOLD OUT</span>' : ''}
          ${hasVariant ? '<span class="variant-badge">🎨 Varian</span>' : ''}
        </div>
        <div class="product-info">
          <span class="category">${CATEGORY_LABELS[p.kategori]}</span>
          <h3>${p.nama}</h3>
          <p class="price">${hasPorsi ? "Mulai " : ""}${formatRupiah(displayPrice)}</p>
        </div>
        <div class="product-actions">
          ${hasVariant ? `
            <button type="button" class="btn-variant" data-variant-id="${p.id}"
                    ${soldOut ? 'disabled' : ''}>
              🎨 Pilih Varian
            </button>
          ` : `
            <button type="button" class="add-to-cart-btn" data-add-id="${p.id}"
                    ${soldOut ? 'disabled' : ''}>
              ${soldOut ? '✕' : '+'}
            </button>
          `}
        </div>
      </article>`;
  }).join("");
}

const getTotalItems = () => cart.reduce((s, it) => s + it.qty, 0);
const getTotalPrice = () => cart.reduce((s, it) => s + (it.harga * it.qty), 0);

function getItemKey(prodId, rasa, toping, porsiId) {
  const r = [...rasa].sort().join(",");
  const t = [...(toping || [])].sort().join(",");
  return `${prodId}|${r}|${t}|${porsiId}`;
}

function addToCart(prodId, qty = 1, options = {}) {
  const product = getProduct(prodId);
  if (!product) return;
  if (isSoldOut(product)) { showToast(`❌ ${product.nama} sudah habis`); return; }

  const rasaIds   = options.rasa   || [];
  const topingIds = options.toping || [];
  const porsiId   = options.porsiId || (product.varianPorsi[0] || null);
  const hargaFinal = hitungHarga(product, porsiId);

  const key = getItemKey(prodId, rasaIds, topingIds, porsiId);
  const existing = cart.find((it) => it.key === key);

  const currentQty = cart.reduce((s, it) => s + it.qty, 0);
  if (currentQty + qty > product.stok) {
    showToast(`⚠️ Stok hanya ${product.stok} pcs`);
    return;
  }

  if (existing) existing.qty += qty;
  else cart.push({ key, id: Number(prodId), qty, harga: hargaFinal, rasa: rasaIds, toping: topingIds, porsiId });
  persistAndRender();
  showToast(`✅ ${product.nama} ditambahkan`);
}

function updateQty(key, delta) {
  const item = cart.find((it) => it.key === key);
  if (!item) return;
  const product = getProduct(item.id);
  if (!product) return;
  const newQty = item.qty + delta;
  if (delta > 0 && newQty > product.stok) {
    showToast(`⚠️ Stok hanya ${product.stok} pcs`);
    return;
  }
  item.qty = newQty;
  if (item.qty <= 0) cart = cart.filter((it) => it.key !== key);
  persistAndRender();
}

function removeFromCart(key) {
  cart = cart.filter((it) => it.key !== key);
  persistAndRender();
}

function persistAndRender() { saveCart(); renderCart(); renderBadge(); }

function renderBadge() {
  if (!dom.cartBadge) return;
  const total = getTotalItems();
  dom.cartBadge.textContent = total;
  dom.cartBadge.classList.toggle("show", total > 0);
  if (total > 0) {
    dom.cartBadge.classList.remove("bump");
    void dom.cartBadge.offsetWidth;
    dom.cartBadge.classList.add("bump");
  }
}

function renderCart() {
  if (!dom.cartBody) return;
  if (cart.length === 0) {
    dom.cartBody.innerHTML = `
      <div class="cart-empty"><p>🛍️</p><p>Keranjang masih kosong.<br>Yuk pilih dessert favoritmu!</p></div>`;
    dom.cartTotal.textContent = "Rp 0";
    dom.checkoutBtn.disabled = true;
    return;
  }

  const allRasa = ZV.loadRasa();
  const allToping = ZV.loadToping();
  const allPorsi = ZV.loadPorsi();

  dom.cartBody.innerHTML = cart.map((it) => {
    const p = getProduct(it.id);
    if (!p) return "";
    const porsiObj = allPorsi.find((x) => x.id === it.porsiId);
    const rasaNames = it.rasa.map((rid) => allRasa.find((r) => r.id === rid)?.nama || "").filter(Boolean).join(", ");
    const topingNames = (it.toping || []).map((tid) => allToping.find((t) => t.id === tid)?.nama || "").filter(Boolean).join(", ");
    const isAtMax = it.qty >= p.stok;

    return `
      <div class="cart-item" data-key="${it.key}">
        <img src="${p.img}" alt="${p.nama}" loading="lazy" />
        <div class="cart-item-info">
          <h4>${p.nama}</h4>
          ${rasaNames ? `<div class="cart-variant">🍫 ${rasaNames}</div>` : ""}
          ${topingNames ? `<div class="cart-variant">🍪 ${topingNames}</div>` : ""}
          ${porsiObj ? `<div class="cart-variant">📦 ${porsiObj.nama}</div>` : ""}
          <span class="cart-item-price">${formatRupiah(it.harga)}</span>
          <div class="cart-item-controls">
            <button type="button" class="qty-btn" data-action="dec" data-key="${it.key}">−</button>
            <span class="qty-value">${it.qty}</span>
            <button type="button" class="qty-btn" data-action="inc" data-key="${it.key}" ${isAtMax ? "disabled" : ""}>+</button>
            <button type="button" class="cart-item-remove" data-action="remove" data-key="${it.key}">Hapus</button>
          </div>
        </div>
      </div>`;
  }).join("");

  dom.cartTotal.textContent = formatRupiah(getTotalPrice());
  dom.checkoutBtn.disabled = false;
}

function openCart() {
  if (!dom.cartPanel) return;
  dom.cartPanel.classList.add("open");
  dom.cartOverlay.classList.add("open");
  dom.cartPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  if (!dom.cartPanel) return;
  dom.cartPanel.classList.remove("open");
  dom.cartOverlay.classList.remove("open");
  dom.cartPanel.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function buildWhatsAppMessage(orderId) {
  if (cart.length === 0) return "";
  const allRasa = ZV.loadRasa();
  const allToping = ZV.loadToping();
  const allPorsi = ZV.loadPorsi();

  const lines = [
    `*👑 PESANAN BARU — ${BRAND.nama}*`,
    `_${BRAND.tagline}_`,
    `🆔 *Order ID:* ${orderId}`,
    "──────────────────",
  ];

  cart.forEach((it, idx) => {
    const p = getProduct(it.id);
    const porsiObj = allPorsi.find((x) => x.id === it.porsiId);
    const rasaNames = it.rasa.map((rid) => allRasa.find((r) => r.id === rid)?.nama || "").filter(Boolean).join(", ");
    const topingNames = (it.toping || []).map((tid) => allToping.find((t) => t.id === tid)?.nama || "").filter(Boolean).join(", ");
    lines.push(`${idx + 1}. *${p.nama}*`);
    if (rasaNames)   lines.push(`   🍫 Rasa: ${rasaNames}`);
    if (topingNames) lines.push(`   🍪 Toping: ${topingNames}`);
    if (porsiObj)    lines.push(`   📦 Porsi: ${porsiObj.nama}`);
    lines.push(`   ${it.qty} x ${formatRupiah(it.harga)} = *${formatRupiah(it.harga * it.qty)}*`);
  });

  lines.push("──────────────────", `*TOTAL: ${formatRupiah(getTotalPrice())}*`, "",
    "Mohon konfirmasi ketersediaan & estimasi pengiriman ya. Terima kasih 🙏");
  return lines.join("\n");
}

function checkoutWhatsApp() {
  const issues = [];
  cart.forEach((it) => {
    const p = getProduct(it.id);
    if (!p || isSoldOut(p) || it.qty > p.stok) issues.push(`❌ ${p?.nama || "Produk"} masalah stok`);
  });
  if (issues.length > 0) { showToast(issues[0]); return; }

  const orderId = window.ZDOrders.generateOrderId();
  const allRasa = ZV.loadRasa();
  const allToping = ZV.loadToping();
  const allPorsi = ZV.loadPorsi();
  const orderItems = cart.map((it) => {
    const p = getProduct(it.id);
    const porsiObj = allPorsi.find((x) => x.id === it.porsiId);
    return {
      id: p.id, nama: p.nama, qty: it.qty, harga: it.harga,
      rasa: it.rasa.map((rid) => allRasa.find((r) => r.id === rid)?.nama || "").filter(Boolean),
      toping: (it.toping || []).map((tid) => allToping.find((t) => t.id === tid)?.nama || "").filter(Boolean),
      porsi: porsiObj ? porsiObj.nama : "",
    };
  });

  window.ZDOrders.addOrder({
    id: orderId, tanggal: new Date().toISOString(),
    items: orderItems, total: getTotalPrice(), status: "pending",
  });

  cart.forEach((it) => {
    const product = PRODUCTS.find((p) => p.id === it.id);
    if (product) product.stok = Math.max(0, product.stok - it.qty);
  });
  window.ZDProducts.saveProducts(PRODUCTS);

  const message = buildWhatsAppMessage(orderId);
  window.open(`https://wa.me/${BRAND.waNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");

  cart = [];
  persistAndRender();
  renderProducts();
  showToast(`✅ Pesanan dibuat — stok dikurangi`);
}

if (dom.filterButtons) {
  dom.filterButtons.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    dom.filterButtons.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.category = btn.dataset.category;
    renderProducts();
  });
}

let searchTimer;
if (dom.searchInput) {
  dom.searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = e.target.value; renderProducts(); }, 200);
  });
}

if (dom.productGrid) {
  dom.productGrid.addEventListener("click", (e) => {
    const variantBtn = e.target.closest(".btn-variant");
    if (variantBtn) {
      if (variantBtn.disabled) return;
      e.stopPropagation();
      const product = getProduct(variantBtn.dataset.variantId);
      if (product) openModal(product);
      return;
    }
    const addBtn = e.target.closest(".add-to-cart-btn");
    if (addBtn) {
      if (addBtn.disabled) return;
      e.stopPropagation();
      const prodId = Number(addBtn.dataset.addId);
      const product = getProduct(prodId);
      const defaultPorsi = product.varianPorsi[0] || null;
      addToCart(prodId, 1, { rasa: [], toping: [], porsiId: defaultPorsi });
      return;
    }
    const card = e.target.closest(".product-card");
    if (card) {
      const product = getProduct(card.dataset.id);
      if (product) openModal(product);
    }
  });
}

if (dom.cartBody) {
  dom.cartBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn || btn.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const key = btn.dataset.key;
    const action = btn.dataset.action;
    if (action === "inc") updateQty(key, +1);
    else if (action === "dec") updateQty(key, -1);
    else if (action === "remove") { removeFromCart(key); showToast("🗑️ Item dihapus"); }
  });
}

if (dom.cartToggle) dom.cartToggle.addEventListener("click", openCart);
const heroCartBtn = document.getElementById("heroCartBtn");
if (heroCartBtn) heroCartBtn.addEventListener("click", openCart);
if (dom.cartClose) dom.cartClose.addEventListener("click", closeCart);
if (dom.cartOverlay) dom.cartOverlay.addEventListener("click", closeCart);
if (dom.checkoutBtn) dom.checkoutBtn.addEventListener("click", checkoutWhatsApp);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeCart(); closeModal(); }
});

const modal = $("#productModal");

function openModal(product) {
  if (!modal) return;
  activeProductModal = product;
  selectedRasa = [];
  selectedToping = [];
  selectedPorsi = product.varianPorsi[0] || null;

  $("#modalImg").src = product.img;
  $("#modalImg").alt = product.nama;
  $("#modalTitle").textContent = product.nama;
  $("#modalDesc").textContent = product.desc;
  $("#modalPrice").textContent = formatRupiah(hitungHarga(product, selectedPorsi));

  const soldOut = isSoldOut(product);
  let statusEl = $("#modalStatus");
  if (!statusEl) {
    statusEl = document.createElement("p");
    statusEl.id = "modalStatus";
    statusEl.className = "modal-status";
    $("#modalDesc").after(statusEl);
  }
  statusEl.textContent = soldOut ? "⛔ Produk ini sudah habis" : "";
  statusEl.style.display = soldOut ? "block" : "none";

  renderVariantOptions(product);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function renderVariantOptions(product) {
  const variantArea = $("#modalVariantArea");
  if (!variantArea) return;

  const allRasa = ZV.loadRasa();
  const allToping = ZV.loadToping();
  const allPorsi = ZV.loadPorsi();

  const availableRasa = product.varianRasa.map((id) => allRasa.find((r) => r.id === id && r.aktif)).filter(Boolean);
  const availableToping = product.varianToping.map((id) => allToping.find((t) => t.id === id && t.aktif)).filter(Boolean);
  const availablePorsi = product.varianPorsi.map((id) => allPorsi.find((p) => p.id === id && p.aktif)).filter(Boolean);

  variantArea.innerHTML = `
    ${availableRasa.length > 0 ? `
      <div class="variant-group">
        <label class="variant-label">🍫 Pilih Rasa <span class="variant-hint">(bisa lebih dari 1)</span></label>
        <div class="variant-chips" data-group="rasa">
          ${availableRasa.map((r) => `<button type="button" class="variant-chip" data-rasa-id="${r.id}">${r.nama}</button>`).join("")}
        </div>
      </div>` : ""}
    ${availableToping.length > 0 ? `
      <div class="variant-group">
        <label class="variant-label">🍪 Pilih Toping <span class="variant-hint">(bisa lebih dari 1)</span></label>
        <div class="variant-chips" data-group="toping">
          ${availableToping.map((t) => `<button type="button" class="variant-chip" data-toping-id="${t.id}">${t.nama}</button>`).join("")}
        </div>
      </div>` : ""}
    ${availablePorsi.length > 0 ? `
      <div class="variant-group">
        <label class="variant-label">📦 Pilih Porsi <span class="variant-hint">(pilih salah satu)</span></label>
        <div class="variant-chips" data-group="porsi">
          ${availablePorsi.map((p) => {
            const harga = hitungHarga(product, p.id);
            return `<button type="button" class="variant-chip ${p.id === selectedPorsi ? 'selected' : ''}"
                      data-porsi-id="${p.id}">${p.nama} — ${formatRupiah(harga)}</button>`;
          }).join("")}
        </div>
      </div>` : ""}
  `;

  variantArea.querySelectorAll("[data-rasa-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.rasaId);
      if (selectedRasa.includes(id)) {
        selectedRasa = selectedRasa.filter((x) => x !== id);
        btn.classList.remove("selected");
      } else {
        selectedRasa.push(id);
        btn.classList.add("selected");
      }
    });
  });

  variantArea.querySelectorAll("[data-toping-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.topingId);
      if (selectedToping.includes(id)) {
        selectedToping = selectedToping.filter((x) => x !== id);
        btn.classList.remove("selected");
      } else {
        selectedToping.push(id);
        btn.classList.add("selected");
      }
    });
  });

  variantArea.querySelectorAll("[data-porsi-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      variantArea.querySelectorAll("[data-porsi-id]").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedPorsi = Number(btn.dataset.porsiId);
      $("#modalPrice").textContent = formatRupiah(hitungHarga(product, selectedPorsi));
    });
  });
}

const modalAddBtn = $("#modalAddBtn");
if (modalAddBtn) {
  modalAddBtn.addEventListener("click", () => {
    if (!activeProductModal) return;
    addToCart(activeProductModal.id, 1, { rasa: selectedRasa, toping: selectedToping, porsiId: selectedPorsi });
    closeModal();
  });
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  activeProductModal = null;
  selectedRasa = [];
  selectedToping = [];
  selectedPorsi = null;
}
const modalCloseBtn = $("#modalClose");
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

const navToggle = $("#navToggle");
const navMenu = $("#navMenu");
if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navMenu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") navMenu.classList.remove("open");
  });
}

const themeToggle = $("#themeToggle");
if (themeToggle) {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

const backToTop = $("#backToTop");
if (backToTop) {
  window.addEventListener("scroll", () => {
    backToTop.classList.toggle("show", window.scrollY > 400);
  }, { passive: true });
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ============================================================
// ULASAN PRODUK (dengan nama)
// ============================================================
const reviewDom = {
  form:        document.getElementById("reviewForm"),
  nameInput:   document.getElementById("reviewName"),
  ratingInput: document.getElementById("reviewRating"),
  textInput:   document.getElementById("reviewText"),
  charCount:   document.getElementById("reviewCharCount"),
  ratingError: document.getElementById("ratingError"),
  starBtns:    document.querySelectorAll("#starRating .star"),
  list:        document.getElementById("reviewsList"),
  avgRating:   document.getElementById("avgRating"),
  avgStars:    document.getElementById("avgStars"),
  reviewCount: document.getElementById("reviewCount"),
  starContainer: document.getElementById("starRating"),
};

function updateStarVisual(rating) {
  reviewDom.starBtns.forEach((star) => {
    star.classList.toggle("active", Number(star.dataset.value) <= rating);
  });
}

function renderStarString(n) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function escapeHtmlApp(str) {
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

// Star click handlers
if (reviewDom.starBtns.length > 0) {
  reviewDom.starBtns.forEach((star) => {
    star.addEventListener("click", function (e) {
      e.preventDefault();
      const val = Number(star.dataset.value);
      selectedRating = val;
      if (reviewDom.ratingInput) reviewDom.ratingInput.value = val;
      if (reviewDom.ratingError) reviewDom.ratingError.textContent = "";
      updateStarVisual(val);
    });
    star.addEventListener("mouseenter", () => {
      updateStarVisual(Number(star.dataset.value));
    });
  });
  if (reviewDom.starContainer) {
    reviewDom.starContainer.addEventListener("mouseleave", () => {
      updateStarVisual(selectedRating);
    });
  }
}

// Char counter
if (reviewDom.textInput && reviewDom.charCount) {
  reviewDom.textInput.addEventListener("input", () => {
    reviewDom.charCount.textContent = reviewDom.textInput.value.length;
  });
}

function renderReviews() {
  if (!reviewDom.list) return;
  const reviews = ZR.loadReviews();
  const count = reviews.length;

  if (reviewDom.reviewCount) reviewDom.reviewCount.textContent = `(${count} ulasan)`;
  const avg = ZR.getAverageRating();
  if (reviewDom.avgRating) reviewDom.avgRating.textContent = avg;
  if (reviewDom.avgStars) reviewDom.avgStars.textContent = renderStarString(Number(avg));

  if (count === 0) {
    reviewDom.list.innerHTML = `<p class="no-reviews">Belum ada ulasan. Jadilah yang pertama! 🌟</p>`;
    return;
  }

  reviewDom.list.innerHTML = reviews.map((r) => {
    const dateStr = new Date(r.tanggal).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
    const initial = String(r.nama || "?").charAt(0).toUpperCase();
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${escapeHtmlApp(initial)}</div>
          <div class="review-meta">
            <div class="review-name">${escapeHtmlApp(r.nama)}</div>
            <div class="review-date">${dateStr}</div>
          </div>
          <div class="review-stars">${renderStarString(r.rating)}</div>
        </div>
        <p class="review-text">${escapeHtmlApp(r.text)}</p>
      </div>`;
  }).join("");
}

// SUBMIT ulasan
if (reviewDom.form) {
  reviewDom.form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = (reviewDom.nameInput?.value || "").trim();
    const text = (reviewDom.textInput?.value || "").trim();
    const rating = Number(reviewDom.ratingInput?.value || 0);

    if (!name) {
      showToast("⚠️ Nama wajib diisi");
      if (reviewDom.nameInput) reviewDom.nameInput.focus();
      return;
    }
    if (rating === 0) {
      if (reviewDom.ratingError) reviewDom.ratingError.textContent = "Pilih rating bintang dulu";
      return;
    }
    if (text.length < 10) {
      showToast("⚠️ Ulasan minimal 10 karakter");
      return;
    }

    const newReview = {
      id: ZR.generateReviewId(),
      nama: name,
      rating: rating,
      text: text,
      tanggal: new Date().toISOString(),
    };

    const success = ZR.addReview(newReview);
    if (!success) { showToast("❌ Gagal simpan ulasan"); return; }

    reviewDom.form.reset();
    selectedRating = 0;
    if (reviewDom.ratingInput) reviewDom.ratingInput.value = "";
    if (reviewDom.charCount) reviewDom.charCount.textContent = "0";
    if (reviewDom.ratingError) reviewDom.ratingError.textContent = "";
    updateStarVisual(0);

    renderReviews();
    showToast("✅ Terima kasih atas ulasan Anda!");
  });
}

// ============================================================
// KRITIK & SARAN (ANONYMOUS)
// ============================================================
const feedbackDom = {
  form:      document.getElementById("feedbackForm"),
  category:  document.getElementById("feedbackCategory"),
  text:      document.getElementById("feedbackText"),
  charCount: document.getElementById("feedbackCharCount"),
  success:   document.getElementById("feedbackSuccess"),
};

if (feedbackDom.text && feedbackDom.charCount) {
  feedbackDom.text.addEventListener("input", () => {
    feedbackDom.charCount.textContent = feedbackDom.text.value.length;
  });
}

if (feedbackDom.form) {
  feedbackDom.form.addEventListener("submit", function (e) {
    e.preventDefault();

    const category = feedbackDom.category?.value || "";
    const text = (feedbackDom.text?.value || "").trim();

    if (!category) { showToast("⚠️ Pilih kategori dulu"); return; }
    if (text.length < 10) { showToast("⚠️ Kritik & saran minimal 10 karakter"); return; }

    const newFeedback = {
      id: ZR.generateFeedbackId(),
      kategori: category,
      text: text,
      tanggal: new Date().toISOString(),
    };

    const success = ZR.addFeedback(newFeedback);
    if (!success) { showToast("❌ Gagal simpan kritik & saran"); return; }

    feedbackDom.form.reset();
    if (feedbackDom.charCount) feedbackDom.charCount.textContent = "0";
    if (feedbackDom.success) {
      feedbackDom.success.hidden = false;
      setTimeout(() => { feedbackDom.success.hidden = true; }, 5000);
    }
    showToast("✅ Terima kasih! Kritik & saran terkirim anonim");
  });
}

// ============================================================
// INIT
// ============================================================
function init() {
  document.title = `${BRAND.nama} — Katalog Dessert`;
  loadCart();
  renderProducts();
  renderCart();
  renderBadge();
  renderReviews();
}
init();
