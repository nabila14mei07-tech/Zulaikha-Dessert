/**
 * Zulaikha Premium Dessert — Master Data Varian
 * Porsi TANPA harga global (harga diatur per produk)
 */

const STORAGE_KEY_RASA   = "zulaikha_rasa_v1";
const STORAGE_KEY_TOPING = "zulaikha_toping_v1";
const STORAGE_KEY_PORSI  = "zulaikha_porsi_v1";

const DEFAULT_RASA = [
  { id: 1, nama: "Coklat",   aktif: true },
  { id: 2, nama: "Tiramisu", aktif: true },
  { id: 3, nama: "Vanilla",  aktif: true },
  { id: 4, nama: "Stroberi", aktif: true },
  { id: 5, nama: "Greentea", aktif: true },
];

const DEFAULT_TOPING = [
  { id: 1, nama: "Oreo",             aktif: true },
  { id: 2, nama: "Keju",             aktif: true },
  { id: 3, nama: "Crumb Red Velvet", aktif: true },
  { id: 4, nama: "Kacang",           aktif: true },
];

const DEFAULT_PORSI = [
  { id: 1, nama: "Small",  aktif: true },
  { id: 2, nama: "Medium", aktif: true },
  { id: 3, nama: "Large",  aktif: true },
];

function _loadVariant(storageKey, defaultData) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(defaultData));
      return [...defaultData];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...defaultData];
  } catch {
    return [...defaultData];
  }
}

function _saveVariant(storageKey, list) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(list));
    return true;
  } catch (e) { console.error("Gagal simpan varian:", e); return false; }
}

function _nextId(list) {
  return list.length === 0 ? 1 : Math.max(...list.map((v) => v.id)) + 1;
}

function loadRasa()   { return _loadVariant(STORAGE_KEY_RASA, DEFAULT_RASA); }
function loadToping() { return _loadVariant(STORAGE_KEY_TOPING, DEFAULT_TOPING); }
function loadPorsi()  { return _loadVariant(STORAGE_KEY_PORSI, DEFAULT_PORSI); }

function saveRasa(list)   { return _saveVariant(STORAGE_KEY_RASA, list); }
function saveToping(list) { return _saveVariant(STORAGE_KEY_TOPING, list); }
function savePorsi(list)  { return _saveVariant(STORAGE_KEY_PORSI, list); }

function getNextRasaId(list)   { return _nextId(list); }
function getNextTopingId(list) { return _nextId(list); }
function getNextPorsiId(list)  { return _nextId(list); }

function getActiveRasa()   { return loadRasa().filter((r) => r.aktif); }
function getActiveToping() { return loadToping().filter((t) => t.aktif); }
function getActivePorsi()  { return loadPorsi().filter((p) => p.aktif); }

window.ZDVariants = {
  loadRasa, saveRasa, getNextRasaId, getActiveRasa,
  loadToping, saveToping, getNextTopingId, getActiveToping,
  loadPorsi, savePorsi, getNextPorsiId, getActivePorsi,
  STORAGE_KEY_RASA, STORAGE_KEY_TOPING, STORAGE_KEY_PORSI,
  DEFAULT_RASA, DEFAULT_TOPING, DEFAULT_PORSI,
};
