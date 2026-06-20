/* App bootstrap: central state, persistence wiring, screen navigation. */
window.App = window.App || {};

App.Main = (function () {
  let state = { data: App.Storage.defaultData() };

  function persist() {
    const ok = App.Storage.save(state.data);
    if (!ok) {
      App.UI.showToast('保存に失敗しました。ブラウザの保存領域が利用できません。エクスポートで控えを取ってください。', 'error');
    }
    return ok;
  }

  function getData() { return state.data; }
  function getRecords() { return state.data.records; }
  function getSettings() { return state.data.settings; }

  function addRecord(fields) {
    const record = {
      id: App.Util.generateId(),
      date: fields.date,
      timing: fields.timing,
      sbp: fields.sbp,
      dbp: fields.dbp,
      pr: fields.pr,
      memo: fields.memo || '',
      createdAt: App.Util.nowISOLocal(),
    };
    state.data.records.push(record);
    persist();
    return record;
  }

  function updateRecord(id, fields) {
    const record = state.data.records.find((r) => r.id === id);
    if (!record) return;
    Object.assign(record, fields);
    persist();
  }

  function deleteRecord(id) {
    state.data.records = state.data.records.filter((r) => r.id !== id);
    persist();
  }

  function deleteAllRecords() {
    state.data.records = [];
    persist();
  }

  function updateSettings(partial) {
    Object.assign(state.data.settings, partial);
    persist();
  }

  function replaceData(newData) {
    state.data = newData;
    persist();
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    document.querySelectorAll('.navbtn').forEach((btn) => {
      if (btn.dataset.screen === name) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
    if (name === 'print') App.PrintScreen.onShow();
    if (name === 'list') App.ListScreen.render();
  }

  function init() {
    const loaded = App.Storage.load();
    state.data = loaded.data;

    if (loaded.unavailable) {
      App.UI.showToast('この環境ではデータを保存できません（プライベートブラウジング等）。エクスポートをご利用ください。', 'error');
    } else if (loaded.corrupted) {
      App.UI.showToast('保存データの読み込みに失敗しました。バックアップから復元してください。', 'error');
    }

    document.querySelectorAll('.navbtn').forEach((btn) => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });

    App.ListScreen.init();
    App.FormScreen.init();
    App.PrintScreen.init();
    App.SettingsScreen.init();

    showScreen('list');
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // file:// has no serviceWorker support; only register when served over http(s).
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Offline install simply won't be available; the app still works online.
    });
  }

  return {
    getData, getRecords, getSettings,
    addRecord, updateRecord, deleteRecord, deleteAllRecords,
    updateSettings, replaceData,
    showScreen, init,
  };
})();

document.addEventListener('DOMContentLoaded', App.Main.init);
