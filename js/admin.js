/**
 * Zulaikha Premium Dessert — Admin Panel
 * CRUD produk + varian + stok + pesanan + ulasan + kritik saran
 */

const ZD = window.ZDProducts;
const ZO = window.ZDOrders;
const ZV = window.ZDVariants;
const ZR = window.ZDReviews;
const hitungHarga = window.ZDProducts.getProductPrice;

let products = ZD.loadProducts();
let orders = ZO.loadOrders();
let editingId = null;
let uploadedImageData = null;

const $ = (s) => document.querySelector(s);

const dom = {
  tableBody:   $("#productTableBody"),
  searchInput: $("#adminSearch"),
  btnAdd:      $("#btnAddProduct"),
  ordersList:  $("#ordersList"),
  modal:       $("#productModal"),
  modalTitle:  $("#modalTitle"),
  modalClose:  $("#modalClose"),
  btnCancel:   $("#btnCancel"),
  form:        $("#productForm"),
  inputId:     $("#inputId"),
  inputNama:   $("#inputNama"),
  inputKat:    $("#inputKategori"),
  inputHarga:  $("#inputHarga"),
  inputStok:   $("#inputStok"),
  inputImg:    $("#inputImg"),
  inputDesc:   $("#inputDesc"),
  inputFile:   $("#inputFile"),
  inputFilePreview: $("#inputFilePreview"),
  toast:       $("#adminToast"),
  statTotal:   $("#statTotal"),
  statAvail:   $("#statAvailable"),
  statOut:     $("#statSoldOut"),
  statStock:   $("#statStock"),
  rasaList:    $("#rasaList"),
  topingList:  $("#topingList"),
  porsiList:   $("#porsiList"),
  formRasa:    $("#formRasa"),
  formToping:  $("#formToping"),
  formPorsi:   $("#formPorsi"),
  adminReviewsList:  $("#adminReviewsList"),
  adminFeedbackList: $("#adminFeedbackList"),
};

const formatRupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function showToast(msg) {
  if (!dom.toast) return;
  dom.toast.textContent = msg;
  dom.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => dom.toast.classList.remove("show"), 2200);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

// ============ STATS ============
function renderStats() {
  const total = products.length;
  const available = products.filter((p) => p.stok > 0).length;
  const soldOut = products.filter((p) => p.stok <= 0).length;
  const totalStock = products.reduce((s, p) => s + Math.max(0, p.stok), 0);
  if (dom.statTotal) dom.statTotal.textContent = total;
  if (dom.statAvail) dom.statAvail.textContent = available;
  if (dom.statOut)   dom.statOut.textContent = soldOut;
  if (dom.statStock) dom.statStock.textContent = totalStock;
}

// ============ PESANAN ============
function renderOrders() {
  if (!dom.ordersList) return;
  if (orders.length === 0) {
    dom.ordersList.innerHTML = `<p class="no-orders">Belum ada pesanan masuk.</p>`;
    return;
  }
  const sorted = [...orders].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  dom.ordersList.innerHTML = sorted.map((o) => {
    const dateStr = new Date(o.tanggal).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
    const itemsStr = o.items.map((it) => {
      const details = [];
      if (it.rasa?.length) details.push(`Rasa: ${it.rasa.join(", ")}`);
      if (it.toping?.length) details.push(`Toping: ${it.toping.join(", ")}`);
      if (it.porsi) details.push(`Porsi: ${it.porsi}`);
      return `• <strong>${escapeHtml(it.nama)}</strong> x${it.qty}` +
        (details.length ? `<br><span class="order-item-details">${details.join(" | ")}</span>` : "");
    }).join("<br>");

    const statusBadge = (() => {
      switch (o.status) {
        case "pending":   return '<span class="order-status status-pending">⏳ Pending</span>';
        case "completed": return '<span class="order-status status-completed">✅ Selesai</span>';
        case "cancelled": return '<span class="order-status status-cancelled">❌ Dibatalkan</span>';
        default:          return '<span class="order-status">?</span>';
      }
    })();

    const actionBtns = o.status === "pending"
      ? `<button class="btn-confirm" data-order-id="${o.id}" data-order-action="confirm">✅ Konfirmasi</button>
         <button class="btn-cancel-order" data-order-id="${o.id}" data-order-action="cancel">❌ Batalkan</button>`
      : "";

    return `
      <div class="order-card status-${o.status}">
        <div class="order-header">
          <div><span class="order-id">${escapeHtml(o.id)}</span>${statusBadge}</div>
          <span class="order-date">${dateStr}</span>
        </div>
        <div class="order-body">
          <div class="order-items">${itemsStr}</div>
          <div class="order-total">Total: <strong>${formatRupiah(o.total)}</strong></div>
        </div>
        ${actionBtns ? `<div class="order-actions">${actionBtns}</div>` : ""}
      </div>`;
  }).join("");
}

if (dom.ordersList) {
  dom.ordersList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-order-action]");
    if (!btn) return;
    const orderId = btn.dataset.orderId;
    const action = btn.dataset.orderAction;
    const order = ZO.getOrder(orderId);
    if (!order) return;

    if (action === "confirm") {
      if (!confirm(`Konfirmasi pesanan ${orderId}?`)) return;
      ZO.updateOrderStatus(orderId, "completed");
      orders = ZO.loadOrders();
      renderOrders();
      showToast(`✅ Pesanan dikonfirmasi`);
    }

    if (action === "cancel") {
      const totalQty = order.items.reduce((s, it) => s + it.qty, 0);
      if (!confirm(`Batalkan pesanan ${orderId}?\n\n⚠️ Stok DIKEMBALIKAN otomatis (+${totalQty}).`)) return;
      order.items.forEach((item) => {
        const product = products.find((p) => p.id === item.id);
        if (product) product.stok += item.qty;
      });
      ZD.saveProducts(products);
      ZO.updateOrderStatus(orderId, "cancelled");
      orders = ZO.loadOrders();
      renderOrders();
      renderTable();
      renderStats();
      showToast(`✅ Pesanan dibatalkan — stok dikembalikan`);
    }
  });
}

// ============ TABEL PRODUK ============
function renderTable() {
  if (!dom.tableBody || !dom.searchInput) return;
  const q = dom.searchInput.value.toLowerCase().trim();
  const filtered = q ? products.filter((p) => p.nama.toLowerCase().includes(q)) : products;

  if (filtered.length === 0) {
    dom.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;opacity:.6;">Tidak ada produk.</td></tr>`;
    return;
  }

  dom.tableBody.innerHTML = filtered.map((p) => {
    const soldOut = p.stok <= 0;
    const stokClass = p.stok === 0 ? "zero" : p.stok <= 3 ? "low" : "";
    const rasaCount   = (p.varianRasa || []).length;
    const topingCount = (p.varianToping || []).length;
    const porsiCount  = (p.varianPorsi || []).length;

    let hargaRange = formatRupiah(p.harga);
    if (porsiCount > 0) {
      const prices = p.varianPorsi.map((pid) => hitungHarga(p, pid)).filter((h) => h > 0);
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        hargaRange = min === max ? formatRupiah(min) : `${formatRupiah(min)} – ${formatRupiah(max)}`;
      }
    }

    return `
      <tr data-id="${p.id}">
        <td><img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.nama)}" onerror="this.style.background='#FFC9D1'" /></td>
        <td>
          <div class="prod-name">${escapeHtml(p.nama)}</div>
          <div class="prod-variants">
            ${rasaCount > 0 ? `<span class="mini-badge">🍫 ${rasaCount} rasa</span>` : ""}
            ${topingCount > 0 ? `<span class="mini-badge">🍪 ${topingCount} toping</span>` : ""}
            ${porsiCount > 0 ? `<span class="mini-badge">📦 ${porsiCount} porsi</span>` : ""}
          </div>
        </td>
        <td><span class="prod-cat">${ZD.CATEGORY_LABEL[p.kategori] || p.kategori}</span></td>
        <td><span class="prod-price">${hargaRange}</span></td>
        <td><input type="number" class="stok-input ${stokClass}" min="0" value="${p.stok}" data-stok-id="${p.id}" /></td>
        <td><span class="badge-status ${soldOut ? 'badge-soldout' : 'badge-available'}">${soldOut ? "Sold Out" : "Tersedia"}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-edit" data-edit-id="${p.id}">Edit</button>
            <button class="btn-del" data-del-id="${p.id}">Hapus</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ============ MASTER VARIAN ============
function renderMasterVarians() {
  const rasaList = ZV.loadRasa();
  if (dom.rasaList) {
    dom.rasaList.innerHTML = rasaList.map((r) => `
      <div class="variant-manage-item">
        <input type="text" class="variant-name-input" value="${escapeHtml(r.nama)}"
               data-variant-type="rasa" data-variant-id="${r.id}" />
        <label class="variant-toggle">
          <input type="checkbox" ${r.aktif ? "checked" : ""}
                 data-variant-type="rasa" data-variant-id="${r.id}" data-toggle />
          <span>Aktif</span>
        </label>
        <button class="btn-del-variant" data-variant-type="rasa" data-variant-id="${r.id}">🗑️</button>
      </div>`).join("");
  }

  const topingList = ZV.loadToping();
  if (dom.topingList) {
    dom.topingList.innerHTML = topingList.map((t) => `
      <div class="variant-manage-item">
        <input type="text" class="variant-name-input" value="${escapeHtml(t.nama)}"
               data-variant-type="toping" data-variant-id="${t.id}" />
        <label class="variant-toggle">
          <input type="checkbox" ${t.aktif ? "checked" : ""}
                 data-variant-type="toping" data-variant-id="${t.id}" data-toggle />
          <span>Aktif</span>
        </label>
        <button class="btn-del-variant" data-variant-type="toping" data-variant-id="${t.id}">🗑️</button>
      </div>`).join("");
  }

  const porsiList = ZV.loadPorsi();
  if (dom.porsiList) {
    dom.porsiList.innerHTML = porsiList.map((p) => `
      <div class="variant-manage-item">
        <input type="text" class="variant-name-input" value="${escapeHtml(p.nama)}"
               data-variant-type="porsi" data-variant-id="${p.id}" />
        <label class="variant-toggle">
          <input type="checkbox" ${p.aktif ? "checked" : ""}
                 data-variant-type="porsi" data-variant-id="${p.id}" data-toggle />
          <span>Aktif</span>
        </label>
        <button class="btn-del-variant" data-variant-type="porsi" data-variant-id="${p.id}">🗑️</button>
      </div>`).join("");
  }
}

document.addEventListener("change", (e) => {
  const inp = e.target;
  if (!inp.dataset.variantType || !inp.dataset.variantId) return;
  const type = inp.dataset.variantType;
  const id = Number(inp.dataset.variantId);

  if (inp.matches("[data-toggle]")) {
    const list = type === "rasa" ? ZV.loadRasa() : type === "toping" ? ZV.loadToping() : ZV.loadPorsi();
    const item = list.find((v) => v.id === id);
    if (item) {
      item.aktif = inp.checked;
      if (type === "rasa") ZV.saveRasa(list);
      else if (type === "toping") ZV.saveToping(list);
      else ZV.savePorsi(list);
      showToast(`✅ ${item.nama} ${inp.checked ? "diaktifkan" : "dinonaktifkan"}`);
    }
  } else if (inp.matches(".variant-name-input")) {
    const newName = inp.value.trim();
    if (!newName) return;
    const list = type === "rasa" ? ZV.loadRasa() : type === "toping" ? ZV.loadToping() : ZV.loadPorsi();
    const item = list.find((v) => v.id === id);
    if (item) {
      item.nama = newName;
      if (type === "rasa") ZV.saveRasa(list);
      else if (type === "toping") ZV.saveToping(list);
      else ZV.savePorsi(list);
      showToast(`✅ Nama diperbarui`);
    }
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-del-variant");
  if (!btn) return;
  const type = btn.dataset.variantType;
  const id = Number(btn.dataset.variantId);
  if (!confirm("Hapus varian ini?\n\nProduk yang memakainya akan otomatis melepas varian ini.")) return;

  let list = type === "rasa" ? ZV.loadRasa() : type === "toping" ? ZV.loadToping() : ZV.loadPorsi();
  list = list.filter((v) => v.id !== id);
  if (type === "rasa") ZV.saveRasa(list);
  else if (type === "toping") ZV.saveToping(list);
  else ZV.savePorsi(list);

  products = products.map((p) => {
    const newP = { ...p };
    if (type === "rasa")   newP.varianRasa = (p.varianRasa || []).filter((vid) => vid !== id);
    if (type === "toping") newP.varianToping = (p.varianToping || []).filter((vid) => vid !== id);
    if (type === "porsi") {
      newP.varianPorsi = (p.varianPorsi || []).filter((vid) => vid !== id);
      if (newP.hargaPorsi) delete newP.hargaPorsi[id];
    }
    return newP;
  });
  ZD.saveProducts(products);
  renderMasterVarians();
  renderTable();
  showToast("🗑️ Varian dihapus");
});

const btnAddRasa = $("#btnAddRasa");
if (btnAddRasa) {
  btnAddRasa.addEventListener("click", () => {
    const list = ZV.loadRasa();
    const nama = prompt("Nama rasa baru:");
    if (!nama || !nama.trim()) return;
    list.push({ id: ZV.getNextRasaId(list), nama: nama.trim(), aktif: true });
    ZV.saveRasa(list);
    renderMasterVarians();
    showToast("✅ Rasa ditambahkan");
  });
}

const btnAddToping = $("#btnAddToping");
if (btnAddToping) {
  btnAddToping.addEventListener("click", () => {
    const list = ZV.loadToping();
    const nama = prompt("Nama toping baru:");
    if (!nama || !nama.trim()) return;
    list.push({ id: ZV.getNextTopingId(list), nama: nama.trim(), aktif: true });
    ZV.saveToping(list);
    renderMasterVarians();
    showToast("✅ Toping ditambahkan");
  });
}

const btnAddPorsi = $("#btnAddPorsi");
if (btnAddPorsi) {
  btnAddPorsi.addEventListener("click", () => {
    const list = ZV.loadPorsi();
    const nama = prompt("Nama porsi baru (mis. Small, Medium, Large):");
    if (!nama || !nama.trim()) return;
    list.push({ id: ZV.getNextPorsiId(list), nama: nama.trim(), aktif: true });
    ZV.savePorsi(list);
    renderMasterVarians();
    showToast("✅ Porsi ditambahkan (harga diatur per produk)");
  });
}

// ============ FORM VARIAN CHECKBOXES ============
function renderFormVariantCheckboxes(selected = {}, existingHargaPorsi = {}) {
  const allRasa = ZV.loadRasa();
  const allToping = ZV.loadToping();
  const allPorsi = ZV.loadPorsi();

  if (dom.formRasa) {
    dom.formRasa.innerHTML = allRasa.map((r) => `
      <label class="checkbox-item">
        <input type="checkbox" value="${r.id}" ${selected.rasa?.includes(r.id) ? "checked" : ""} />
        <span>${escapeHtml(r.nama)}${r.aktif ? "" : " <em>(nonaktif)</em>"}</span>
      </label>`).join("");
  }
  if (dom.formToping) {
    dom.formToping.innerHTML = allToping.map((t) => `
      <label class="checkbox-item">
        <input type="checkbox" value="${t.id}" ${selected.toping?.includes(t.id) ? "checked" : ""} />
        <span>${escapeHtml(t.nama)}${t.aktif ? "" : " <em>(nonaktif)</em>"}</span>
      </label>`).join("");
  }
  if (dom.formPorsi) {
    dom.formPorsi.innerHTML = allPorsi.map((p) => {
      const isChecked = selected.porsi?.includes(p.id);
      const currentHarga = existingHargaPorsi[p.id] ?? "";
      return `
        <div class="porsi-item">
          <label class="checkbox-item porsi-check">
            <input type="checkbox" value="${p.id}" ${isChecked ? "checked" : ""} data-porsi-check />
            <span>${escapeHtml(p.nama)}${p.aktif ? "" : " <em>(nonaktif)</em>"}</span>
          </label>
          <input type="number" class="porsi-harga-input" placeholder="Harga"
                 min="0" step="1000" value="${currentHarga}"
                 data-porsi-harga-id="${p.id}" />
        </div>`;
    }).join("");
  }
}

function getCheckedValues(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map((inp) => Number(inp.value));
}

function getHargaPorsiFromForm() {
  const hargaPorsi = {};
  if (!dom.formPorsi) return hargaPorsi;
  dom.formPorsi.querySelectorAll("[data-porsi-harga-id]").forEach((inp) => {
    const porsiId = Number(inp.dataset.porsiHargaId);
    const check = dom.formPorsi.querySelector(`input[data-porsi-check][value="${porsiId}"]`);
    if (check && check.checked) {
      hargaPorsi[porsiId] = Math.max(0, parseInt(inp.value, 10) || 0);
    }
  });
  return hargaPorsi;
}

if (dom.inputFile) {
  dom.inputFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("⚠️ Ukuran foto maks 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      uploadedImageData = dataUrl;
      dom.inputImg.value = dataUrl;
      if (dom.inputFilePreview) {
        dom.inputFilePreview.innerHTML = `<img src="${dataUrl}" alt="Preview" class="file-preview-img" />`;
        dom.inputFilePreview.style.display = "block";
      }
      showToast("✅ Foto terupload");
    };
    reader.readAsDataURL(file);
  });
}

function openModal(editProduct = null) {
  if (!dom.modal) return;
  editingId = editProduct ? editProduct.id : null;
  uploadedImageData = null;
  dom.modalTitle.textContent = editProduct ? "Edit Produk" : "Tambah Produk";

  if (editProduct) {
    dom.inputId.value = editProduct.id;
    dom.inputNama.value = editProduct.nama;
    dom.inputKat.value = editProduct.kategori;
    dom.inputHarga.value = editProduct.harga;
    dom.inputStok.value = editProduct.stok;
    dom.inputImg.value = editProduct.img || "";
    dom.inputDesc.value = editProduct.desc || "";

    if (dom.inputFilePreview) {
      if (editProduct.img && editProduct.img.startsWith("data:")) {
        dom.inputFilePreview.innerHTML = `<img src="${editProduct.img}" alt="Preview" class="file-preview-img" />`;
        dom.inputFilePreview.style.display = "block";
      } else {
        dom.inputFilePreview.innerHTML = "";
        dom.inputFilePreview.style.display = "none";
      }
    }

    renderFormVariantCheckboxes(
      {
        rasa: editProduct.varianRasa || [],
        toping: editProduct.varianToping || [],
        porsi: editProduct.varianPorsi || [],
      },
      editProduct.hargaPorsi || {}
    );
  } else {
    dom.form.reset();
    dom.inputId.value = "";
    if (dom.inputFilePreview) {
      dom.inputFilePreview.innerHTML = "";
      dom.inputFilePreview.style.display = "none";
    }
    renderFormVariantCheckboxes();
  }

  dom.modal.classList.add("open");
  dom.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => dom.inputNama.focus(), 100);
}

function closeModal() {
  if (!dom.modal) return;
  dom.modal.classList.remove("open");
  dom.modal.setAttribute("aria-hidden", "true");
  editingId = null;
  uploadedImageData = null;
}

if (dom.btnAdd)     dom.btnAdd.addEventListener("click", () => openModal());
if (dom.modalClose) dom.modalClose.addEventListener("click", closeModal);
if (dom.btnCancel)  dom.btnCancel.addEventListener("click", closeModal);
if (dom.modal) {
  dom.modal.addEventListener("click", (e) => { if (e.target === dom.modal) closeModal(); });
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

if (dom.form) {
  dom.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const imgValue = dom.inputImg.value.trim();
    const data = {
      nama: dom.inputNama.value.trim(),
      kategori: dom.inputKat.value,
      harga: Math.max(0, parseInt(dom.inputHarga.value, 10) || 0),
      stok: Math.max(0, parseInt(dom.inputStok.value, 10) || 0),
      img: imgValue || "assets/placeholder.jpeg",
      desc: dom.inputDesc.value.trim() || "",
      varianRasa:   getCheckedValues(dom.formRasa),
      varianToping: getCheckedValues(dom.formToping),
      varianPorsi:  getCheckedValues(dom.formPorsi),
      hargaPorsi:   getHargaPorsiFromForm(),
    };
    if (!data.nama) { showToast("⚠️ Nama produk wajib diisi"); return; }
    if (data.varianPorsi.length > 0) {
      const missingPrice = data.varianPorsi.some((pid) => !data.hargaPorsi[pid] || data.hargaPorsi[pid] <= 0);
      if (missingPrice) {
        showToast("⚠️ Isi harga untuk setiap porsi yang dipilih");
        return;
      }
    }

    if (editingId !== null) {
      const idx = products.findIndex((p) => p.id === editingId);
      if (idx === -1) return;
      products[idx] = { ...products[idx], ...data };
      showToast(`✅ "${data.nama}" diperbarui`);
    } else {
      products.push({ id: ZD.getNextId(products), ...data });
      showToast(`✅ "${data.nama}" ditambahkan`);
    }
    ZD.saveProducts(products);
    renderAll();
    closeModal();
  });
}

if (dom.tableBody) {
  dom.tableBody.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit");
    if (editBtn) {
      const id = Number(editBtn.dataset.editId);
      const product = products.find((p) => p.id === id);
      if (product) openModal(product);
      return;
    }
    const delBtn = e.target.closest(".btn-del");
    if (delBtn) {
      const id = Number(delBtn.dataset.delId);
      const product = products.find((p) => p.id === id);
      if (!product) return;
      if (!confirm(`Hapus produk "${product.nama}"?`)) return;
      products = products.filter((p) => p.id !== id);
      ZD.saveProducts(products);
      renderAll();
      showToast(`🗑️ "${product.nama}" dihapus`);
    }
  });

  dom.tableBody.addEventListener("change", (e) => {
    const inp = e.target.closest(".stok-input");
    if (!inp) return;
    const id = Number(inp.dataset.stokId);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const newVal = Math.max(0, parseInt(inp.value, 10) || 0);
    product.stok = newVal;
    ZD.saveProducts(products);
    renderTable();
    renderStats();
    showToast(`✅ Stok "${product.nama}" → ${newVal}`);
  });
}

// ============ ULASAN (ADMIN) ============
function renderAdminReviews() {
  if (!dom.adminReviewsList) return;
  const reviews = ZR.loadReviews();

  if (reviews.length === 0) {
    dom.adminReviewsList.innerHTML = `<p class="no-orders">Belum ada ulasan dari customer.</p>`;
    return;
  }

  dom.adminReviewsList.innerHTML = reviews.map((r) => {
    const dateStr = new Date(r.tanggal).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
    const rating = Number(r.rating) || 0;
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    return `
      <div class="admin-review-card">
        <div class="admin-review-header">
          <div>
            <strong class="review-author">👤 ${escapeHtml(r.nama)}</strong>
            <span class="review-stars-small">${stars}</span>
          </div>
          <button class="btn-delete-review" data-review-id="${r.id}">🗑️ Hapus</button>
        </div>
        <p class="review-body">${escapeHtml(r.text)}</p>
        <span class="review-timestamp">${dateStr}</span>
      </div>`;
  }).join("");
}

if (dom.adminReviewsList) {
  dom.adminReviewsList.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-delete-review");
    if (!btn) return;
    if (!confirm("Hapus ulasan ini?\n\nTindakan tidak bisa dibatalkan.")) return;
    ZR.deleteReview(btn.dataset.reviewId);
    renderAdminReviews();
    showToast("🗑️ Ulasan dihapus");
  });
}

// ============ KRITIK & SARAN (ADMIN — ANONYMOUS) ============
function renderAdminFeedback() {
  if (!dom.adminFeedbackList) return;
  const feedbackList = ZR.loadFeedback();

  if (feedbackList.length === 0) {
    dom.adminFeedbackList.innerHTML = `<p class="no-orders">Belum ada kritik & saran dari customer.</p>`;
    return;
  }

  const CATEGORY_LABELS = {
    produk: "Produk & Rasa", pelayanan: "Pelayanan", pengiriman: "Pengiriman",
    harga: "Harga", website: "Website", lainnya: "Lainnya",
  };

  dom.adminFeedbackList.innerHTML = feedbackList.map((f) => {
    const dateStr = new Date(f.tanggal).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
    const catLabel = CATEGORY_LABELS[f.kategori] || f.kategori;
    return `
      <div class="admin-feedback-card">
        <div class="admin-feedback-header">
          <div>
            <span class="feedback-category">${catLabel}</span>
            <span class="feedback-author">🌟 Anonim</span>
          </div>
          <button class="btn-delete-feedback" data-feedback-id="${f.id}">🗑️ Hapus</button>
        </div>
        <p class="feedback-body">${escapeHtml(f.text)}</p>
        <span class="review-timestamp">${dateStr}</span>
      </div>`;
  }).join("");
}

if (dom.adminFeedbackList) {
  dom.adminFeedbackList.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-delete-feedback");
    if (!btn) return;
    if (!confirm("Hapus kritik & saran ini?\n\nTindakan tidak bisa dibatalkan.")) return;
    ZR.deleteFeedback(btn.dataset.feedbackId);
    renderAdminFeedback();
    showToast("🗑️ Kritik saran dihapus");
  });
}

// ============ TAB SWITCHING ============
document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".admin-tab-pane").forEach((pane) => pane.classList.remove("active"));
    const pane = document.getElementById(`tab-${tab}`);
    if (pane) pane.classList.add("active");
  });
});

// ============ AUTO REFRESH ============
window.addEventListener("storage", (e) => {
  if (!e.key) return;
  if (e.key === ZD.STORAGE_KEY_PRODUCTS) {
    products = ZD.loadProducts();
    renderStats();
    renderTable();
  }
  if (e.key === ZO.STORAGE_KEY_ORDERS) {
    orders = ZO.loadOrders();
    renderOrders();
  }
  if (e.key === ZR.STORAGE_KEY_REVIEWS) {
    renderAdminReviews();
  }
  if (e.key === ZR.STORAGE_KEY_FEEDBACK) {
    renderAdminFeedback();
  }
});

// Polling fallback tiap 5 detik
let lastProductsJSON = JSON.stringify(products);
let lastOrdersJSON   = JSON.stringify(orders);
let lastReviewsJSON  = JSON.stringify(ZR.loadReviews());
let lastFeedbackJSON = JSON.stringify(ZR.loadFeedback());

setInterval(() => {
  const latestProducts = ZD.loadProducts();
  if (JSON.stringify(latestProducts) !== lastProductsJSON) {
    products = latestProducts;
    lastProductsJSON = JSON.stringify(products);
    renderStats();
    renderTable();
  }
  const latestOrders = ZO.loadOrders();
  if (JSON.stringify(latestOrders) !== lastOrdersJSON) {
    orders = latestOrders;
    lastOrdersJSON = JSON.stringify(orders);
    renderOrders();
  }
  const latestReviews = ZR.loadReviews();
  const reviewsJSON = JSON.stringify(latestReviews);
  if (reviewsJSON !== lastReviewsJSON) {
    lastReviewsJSON = reviewsJSON;
    renderAdminReviews();
  }
  const latestFeedback = ZR.loadFeedback();
  const feedbackJSON = JSON.stringify(latestFeedback);
  if (feedbackJSON !== lastFeedbackJSON) {
    lastFeedbackJSON = feedbackJSON;
    renderAdminFeedback();
  }
}, 5000);

// ============ INIT ============
function renderAll() {
  renderStats();
  renderTable();
  renderOrders();
  renderMasterVarians();
  renderAdminReviews();
  renderAdminFeedback();
}

function init() {
  renderAll();
}
init();
