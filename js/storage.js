/* localStorage persistence, schema versioning, export/import. */
window.App = window.App || {};

App.Storage = (function () {
  const STORAGE_KEY = 'bpTrackerData';
  const SCHEMA_VERSION = 2; // v2 adds required `timing` ('morning' | 'evening') per record

  // Records created before timing existed have none — infer from when they were
  // logged rather than forcing every old record into one bucket.
  function inferTiming(r) {
    if (r.timing === 'morning' || r.timing === 'evening') return r.timing;
    const hour = typeof r.createdAt === 'string' ? new Date(r.createdAt).getHours() : NaN;
    return Number.isFinite(hour) && hour < 12 ? 'morning' : 'evening';
  }

  function defaultData() {
    return {
      version: SCHEMA_VERSION,
      settings: {
        name: '',
        printFontSize: 'standard',
        showPageNumber: false,
        autoFit: true,
        defaultSort: 'desc',
      },
      records: [],
    };
  }

  function isAvailable() {
    try {
      const probeKey = '__bp_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isValidRecordShape(r) {
    return r && typeof r === 'object' &&
      typeof r.date === 'string' &&
      Number.isFinite(r.sbp) && Number.isFinite(r.dbp) && Number.isFinite(r.pr);
  }

  function normalizeRecord(r) {
    return {
      id: typeof r.id === 'string' && r.id ? r.id : App.Util.generateId(),
      date: r.date,
      timing: inferTiming(r),
      sbp: Math.round(r.sbp),
      dbp: Math.round(r.dbp),
      pr: Math.round(r.pr),
      memo: typeof r.memo === 'string' ? r.memo : '',
      createdAt: typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : App.Util.nowISOLocal(),
    };
  }

  // Returns { data, corrupted } — never throws.
  function load() {
    if (!isAvailable()) {
      return { data: defaultData(), corrupted: false, unavailable: true };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { data: defaultData(), corrupted: false, unavailable: false };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
        return { data: defaultData(), corrupted: true, unavailable: false };
      }
      const data = defaultData();
      data.settings = Object.assign(data.settings, parsed.settings || {});
      data.records = parsed.records.filter(isValidRecordShape).map(normalizeRecord);
      return { data, corrupted: false, unavailable: false };
    } catch (e) {
      return { data: defaultData(), corrupted: true, unavailable: false };
    }
  }

  // Returns true on success, false on failure (quota/unavailable).
  function save(data) {
    if (!isAvailable()) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function toJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function toCSV(records) {
    const header = ['日付', '収縮期', '拡張期', '脈拍', 'メモ'];
    const lines = [header.join(',')];
    records.forEach((r) => {
      lines.push([r.date, r.sbp, r.dbp, r.pr, csvEscape(r.memo)].join(','));
    });
    return '﻿' + lines.join('\r\n');
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportJSON(data) {
    downloadFile('bp-tracker-backup-' + App.Util.todayStr() + '.json', toJSON(data), 'application/json');
  }

  function exportCSV(records) {
    downloadFile('bp-tracker-' + App.Util.todayStr() + '.csv', toCSV(records), 'text/csv');
  }

  // mode: 'merge' | 'replace'
  function importJSON(jsonText, existingData, mode) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      return { success: false, error: 'JSONの解析に失敗しました。ファイルが破損している可能性があります。' };
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
      return { success: false, error: 'ファイルの形式が正しくありません。' };
    }
    const incomingRecords = parsed.records.filter(isValidRecordShape).map(normalizeRecord);

    if (mode === 'replace') {
      const data = defaultData();
      data.settings = Object.assign(data.settings, parsed.settings || {});
      data.records = incomingRecords;
      return { success: true, data };
    }

    // merge: upsert by id, keep existing settings
    const byId = new Map();
    existingData.records.forEach((r) => byId.set(r.id, r));
    incomingRecords.forEach((r) => byId.set(r.id, r));
    const data = {
      version: SCHEMA_VERSION,
      settings: existingData.settings,
      records: Array.from(byId.values()),
    };
    return { success: true, data };
  }

  return {
    STORAGE_KEY, SCHEMA_VERSION,
    defaultData, isAvailable, load, save,
    exportJSON, exportCSV, importJSON,
  };
})();
