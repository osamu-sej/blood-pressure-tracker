/* Record add/edit screen. (§6.1, §6.3, §8) */
window.App = window.App || {};

App.FormScreen = (function () {
  let editingId = null;
  let pickers = {};
  let currentTiming = null;

  function getLastValues() {
    const records = App.Main.getRecords();
    if (records.length === 0) return { sbp: 120, dbp: 80, pr: 70 };
    const sorted = records.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { sbp: sorted[0].sbp, dbp: sorted[0].dbp, pr: sorted[0].pr };
  }

  function defaultTimingForNow() {
    return new Date().getHours() < 12 ? 'morning' : 'evening';
  }

  function setTiming(timing) {
    currentTiming = timing;
    document.querySelectorAll('.timing-btn').forEach((btn) => {
      btn.setAttribute('aria-checked', String(btn.dataset.timing === timing));
    });
  }

  // Date is auto-filled (today, or the record's own date when editing) and stays
  // collapsed to plain text — nobody measures yesterday's or tomorrow's blood
  // pressure, so picking a date shouldn't be part of the daily flow. The native
  // picker is still reachable via "違う日付にする" for the rare backdate/fix case.
  function updateDateDisplay() {
    const dateStr = document.getElementById('field-date').value;
    const display = App.Util.displayDate(dateStr);
    document.getElementById('date-display-text').textContent =
      dateStr === App.Util.todayStr() ? `今日（${display}）` : display;
  }

  function setDateMode(mode) {
    const collapsedRow = document.getElementById('date-display-row');
    const input = document.getElementById('field-date');
    if (mode === 'expanded') {
      collapsedRow.classList.add('hidden');
      input.classList.remove('hidden');
    } else {
      updateDateDisplay();
      collapsedRow.classList.remove('hidden');
      input.classList.add('hidden');
    }
  }

  function clearErrors() {
    ['date', 'timing', 'sbp', 'dbp', 'pr'].forEach((key) => {
      document.getElementById('error-' + key).textContent = '';
    });
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach((key) => {
      const el = document.getElementById('error-' + key);
      if (el) el.textContent = errors[key];
    });
  }

  // opts (only used when recordId is null, i.e. adding): { presetDate, presetTiming }
  // — lets the 今日カード open the form pre-filled for the slot that was tapped.
  function openForm(recordId, opts) {
    editingId = recordId;
    clearErrors();
    const dateInput = document.getElementById('field-date');
    dateInput.max = App.Util.todayStr();
    const memoInput = document.getElementById('field-memo');
    const deleteBtn = document.getElementById('record-delete');
    const heading = document.getElementById('form-heading');

    if (recordId) {
      const record = App.Main.getRecords().find((r) => r.id === recordId);
      heading.textContent = '記録を編集';
      dateInput.value = record.date;
      memoInput.value = record.memo;
      setTiming(record.timing);
      pickers.sbp.set(record.sbp);
      pickers.dbp.set(record.dbp);
      pickers.pr.set(record.pr);
      deleteBtn.classList.remove('hidden');
    } else {
      const last = getLastValues();
      heading.textContent = '記録を追加';
      dateInput.value = (opts && opts.presetDate) || App.Util.todayStr();
      memoInput.value = '';
      setTiming((opts && opts.presetTiming) || defaultTimingForNow());
      pickers.sbp.set(last.sbp);
      pickers.dbp.set(last.dbp);
      pickers.pr.set(last.pr);
      deleteBtn.classList.add('hidden');
    }
    setDateMode('collapsed');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const input = {
      date: document.getElementById('field-date').value,
      timing: currentTiming,
      sbp: pickers.sbp.get(),
      dbp: pickers.dbp.get(),
      pr: pickers.pr.get(),
    };
    const memo = document.getElementById('field-memo').value;

    const result = App.Validation.validateRecord(input);
    if (!result.valid) {
      showErrors(result.errors);
      App.UI.showToast('入力内容を確認してください', 'error');
      return;
    }
    clearErrors();

    if (result.warning === 'dbpGteSbp') {
      const ok = await App.UI.confirmDialog({
        title: '値の確認',
        message: '拡張期（最低）が収縮期（最高）以上です。よろしいですか？',
        confirmLabel: 'このまま保存',
      });
      if (!ok) return;
    }

    if (editingId) {
      App.Main.updateRecord(editingId, { date: input.date, timing: input.timing, sbp: input.sbp, dbp: input.dbp, pr: input.pr, memo });
    } else {
      App.Main.addRecord({ date: input.date, timing: input.timing, sbp: input.sbp, dbp: input.dbp, pr: input.pr, memo });
    }

    App.UI.showToast('保存しました', 'success');
    App.ListScreen.render();
    App.Main.showScreen('list');
  }

  async function handleDelete() {
    if (!editingId) return;
    const ok = await App.UI.confirmDialog({
      title: '記録の削除',
      message: 'この記録を削除しますか？',
      confirmLabel: '削除する',
      danger: true,
    });
    if (!ok) return;
    App.Main.deleteRecord(editingId);
    App.UI.showToast('削除しました', 'success');
    App.ListScreen.render();
    App.Main.showScreen('list');
  }

  function init() {
    pickers.sbp = App.NumberPicker.create({
      key: 'sbp', label: '収縮期血圧 (SBP)', min: App.Validation.RULES.sbp.min, max: App.Validation.RULES.sbp.max,
      wheelMin: 70, wheelMax: 250, initial: 120,
    });
    pickers.dbp = App.NumberPicker.create({
      key: 'dbp', label: '拡張期血圧 (DBP)', min: App.Validation.RULES.dbp.min, max: App.Validation.RULES.dbp.max,
      wheelMin: 40, wheelMax: 160, initial: 80,
    });
    pickers.pr = App.NumberPicker.create({
      key: 'pr', label: '脈拍 (PR)', min: App.Validation.RULES.pr.min, max: App.Validation.RULES.pr.max,
      wheelMin: 30, wheelMax: 200, initial: 70,
    });
    document.getElementById('numfield-sbp-container').appendChild(pickers.sbp.el);
    document.getElementById('numfield-dbp-container').appendChild(pickers.dbp.el);
    document.getElementById('numfield-pr-container').appendChild(pickers.pr.el);

    document.querySelectorAll('.timing-btn').forEach((btn) => {
      btn.addEventListener('click', () => setTiming(btn.dataset.timing));
    });

    document.getElementById('date-change-toggle').addEventListener('click', () => setDateMode('expanded'));
    document.getElementById('field-date').addEventListener('change', updateDateDisplay);

    document.getElementById('record-form').addEventListener('submit', handleSubmit);
    document.getElementById('record-delete').addEventListener('click', handleDelete);
    document.getElementById('form-back').addEventListener('click', () => App.Main.showScreen('list'));
  }

  return { init, openForm };
})();
