/**
 * Zulaikha Premium Dessert — Reviews & Feedback
 * Ulasan: public dengan nama. Kritik & Saran: anonymous (hanya admin).
 */

const STORAGE_KEY_REVIEWS  = "zulaikha_reviews_v1";
const STORAGE_KEY_FEEDBACK = "zulaikha_feedback_v1";

// ============ ULASAN ============
function loadReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(reviews));
    return true;
  } catch (e) { console.error("Gagal simpan ulasan:", e); return false; }
}

function addReview(review) {
  const reviews = loadReviews();
  reviews.unshift(review);
  return saveReviews(reviews);
}

function deleteReview(reviewId) {
  const reviews = loadReviews();
  return saveReviews(reviews.filter((r) => r.id !== reviewId));
}

function getAverageRating() {
  const reviews = loadReviews();
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  return (total / reviews.length).toFixed(1);
}

function generateReviewId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  return `RV-${ts}-${rand}`;
}

// ============ KRITIK & SARAN (ANONYMOUS) ============
function loadFeedback() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveFeedback(feedbackList) {
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(feedbackList));
    return true;
  } catch (e) { console.error("Gagal simpan kritik saran:", e); return false; }
}

function addFeedback(feedback) {
  const list = loadFeedback();
  list.unshift(feedback);
  return saveFeedback(list);
}

function deleteFeedback(feedbackId) {
  const list = loadFeedback();
  return saveFeedback(list.filter((f) => f.id !== feedbackId));
}

function generateFeedbackId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  return `FB-${ts}-${rand}`;
}

window.ZDReviews = {
  loadReviews, saveReviews, addReview, deleteReview, getAverageRating, generateReviewId, STORAGE_KEY_REVIEWS,
  loadFeedback, saveFeedback, addFeedback, deleteFeedback, generateFeedbackId, STORAGE_KEY_FEEDBACK,
};
