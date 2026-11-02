/**
 * Zulaikha Premium Dessert — Auth Helper
 * Password admin & session management
 */

// ⚠️ PASSWORD ADMIN — ganti sesuai kebutuhan
const ADMIN_PASSWORD = "zulaikha2026";

const SESSION_KEY = "zulaikha_admin_logged_v1";

function verifyPassword(inputPassword) {
  return String(inputPassword).trim() === ADMIN_PASSWORD;
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function setLoggedIn(status) {
  if (status) {
    sessionStorage.setItem(SESSION_KEY, "true");
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

window.ZDAuth = {
  verifyPassword,
  isLoggedIn,
  setLoggedIn,
  logout,
  requireLogin,
  SESSION_KEY,
};

// DEBUG: log di console untuk verifikasi
console.log("✅ auth.js OK — ZDAuth ready | password aktif tersimpan");
