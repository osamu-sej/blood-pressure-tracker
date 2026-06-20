/* Shared helpers: dates, ids, namespace setup. No external deps. */
window.App = window.App || {};

App.Util = (function () {
  function pad(n, len) {
    return String(n).padStart(len, '0');
  }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  function todayDisplayStr() {
    return toDateStr(new Date()).replace(/-/g, '/');
  }

  function displayDate(dateStr) {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '/');
  }

  function addMonths(date, n) {
    const d = new Date(date.getFullYear(), date.getMonth() + n, date.getDate());
    return d;
  }

  function startOfWeek(date) {
    const dow = date.getDay(); // 0=Sun..6=Sat
    const diff = (dow + 6) % 7; // days since Monday
    const d = new Date(date);
    d.setDate(d.getDate() - diff);
    return d;
  }

  function endOfWeek(date) {
    const start = startOfWeek(date);
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    return d;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function nowISOLocal() {
    const d = new Date();
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const offsetStr = sign + pad(Math.floor(abs / 60), 2) + ':' + pad(abs % 60, 2);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) +
      'T' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2) +
      offsetStr;
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    pad, toDateStr, todayStr, todayDisplayStr, displayDate,
    addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    nowISOLocal, generateId, clamp, escapeHtml,
  };
})();
