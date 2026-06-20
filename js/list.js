/* Home screen: list, filter, sort, row edit/delete. (§6.2, §6.3, §6.4, §6.5) */
window.App = window.App || {};

App.ListScreen = (function () {
  let filter = { start: '', end: '' };
  let sortDir = 'desc'; // 'asc' | 'desc' — default set from settings on init()

  function getBandClass(sbp, dbp) {
    if (sbp >= 160 || dbp >= 100) return 'band-red';
    if (sbp >= 135 || dbp >= 85) return 'band-yellow';
    return 'band-green';
  }

  function timingLabel(timing) {
    return timing === 'morning' ? '朝' : '夜';
  }

  // Most recent record (by createdAt) for today + the given timing, or null.
  function findTodaySlotRecord(timing) {
    const today = App.Util.todayStr();
    const matches = App.Main.getRecords().filter((r) => r.date === today && r.timing === timing);
    if (matches.length === 0) return null;
    return matches.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
  }

  function renderTodayCard() {
    document.getElementById('today-date-label').textContent = App.Util.displayDate(App.Util.todayStr());
    ['morning', 'evening'].forEach((timing) => {
      const record = findTodaySlotRecord(timing);
      const slot = document.querySelector(`.today-slot[data-timing="${timing}"]`);
      const valueEl = document.getElementById(`today-slot-${timing}-value`);
      if (record) {
        slot.classList.add('filled');
        valueEl.textContent = `${record.sbp}/${record.dbp} (${record.pr})`;
      } else {
        slot.classList.remove('filled');
        valueEl.textContent = '未入力';
      }
    });
  }

  function applyPreset(preset) {
    const today = new Date();
    switch (preset) {
      case 'week':
        filter.start = App.Util.toDateStr(App.Util.startOfWeek(today));
        filter.end = App.Util.toDateStr(App.Util.endOfWeek(today));
        break;
      case 'month':
        filter.start = App.Util.toDateStr(App.Util.startOfMonth(today));
        filter.end = App.Util.toDateStr(App.Util.endOfMonth(today));
        break;
      case '1m':
        filter.start = App.Util.toDateStr(App.Util.addMonths(today, -1));
        filter.end = App.Util.todayStr();
        break;
      case '3m':
        filter.start = App.Util.toDateStr(App.Util.addMonths(today, -3));
        filter.end = App.Util.todayStr();
        break;
      case 'all':
      default:
        filter.start = '';
        filter.end = '';
        break;
    }
    document.getElementById('filter-start').value = filter.start;
    document.getElementById('filter-end').value = filter.end;
  }

  function getFilteredSorted() {
    const all = App.Main.getRecords();
    const filtered = all.filter((r) => {
      if (filter.start && r.date < filter.start) return false;
      if (filter.end && r.date > filter.end) return false;
      return true;
    });
    filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return sortDir === 'asc' ? (a.date < b.date ? -1 : 1) : (a.date < b.date ? 1 : -1);
      }
      return a.createdAt < b.createdAt ? -1 : (a.createdAt > b.createdAt ? 1 : 0);
    });
    return filtered;
  }

  function render() {
    const all = App.Main.getRecords();
    const filtered = getFilteredSorted();
    const tbody = document.getElementById('list-tbody');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('list-table');

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      table.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = all.length === 0
        ? 'まだ記録がありません。右下の＋から最初の記録を追加しましょう。'
        : '条件に合う記録がありません。';
    } else {
      table.classList.remove('hidden');
      emptyState.classList.add('hidden');
      filtered.forEach((r) => {
        const tr = document.createElement('tr');
        tr.className = getBandClass(r.sbp, r.dbp);
        tr.dataset.id = r.id;
        tr.innerHTML = `
          <td>${App.Util.displayDate(r.date)}</td>
          <td class="timing-cell">${timingLabel(r.timing)}</td>
          <td class="num">${r.sbp}</td>
          <td class="num">${r.dbp}</td>
          <td class="num">${r.pr}</td>
          <td class="memo-cell">${App.Util.escapeHtml(r.memo)}</td>
          <td class="actions-col"><button type="button" class="row-delete-btn" aria-label="削除" data-id="${r.id}">×</button></td>
        `;
        tr.addEventListener('click', (e) => {
          if (e.target.closest('.row-delete-btn')) return;
          App.FormScreen.openForm(r.id);
          App.Main.showScreen('form');
        });
        tbody.appendChild(tr);
      });
    }

    document.getElementById('record-count').textContent =
      `全 ${all.length} 件 / 表示 ${filtered.length} 件`;

    updateSortButtonLabel();
    renderTodayCard();
  }

  function updateSortButtonLabel() {
    document.getElementById('sort-toggle').textContent =
      '並び替え: ' + (sortDir === 'desc' ? '新しい順 ▼' : '古い順 ▲');
  }

  async function handleDeleteClick(id) {
    const ok = await App.UI.confirmDialog({
      title: '記録の削除',
      message: 'この記録を削除しますか？',
      confirmLabel: '削除する',
      danger: true,
    });
    if (!ok) return;
    App.Main.deleteRecord(id);
    App.UI.showToast('削除しました', 'success');
    render();
  }

  function init() {
    sortDir = App.Main.getSettings().defaultSort || 'desc';

    document.getElementById('filter-start').addEventListener('change', onFilterChange);
    document.getElementById('filter-end').addEventListener('change', onFilterChange);

    document.querySelectorAll('.preset-btn').forEach((btn) => {
      if (btn.dataset.target === 'print') return;
      btn.addEventListener('click', () => {
        applyPreset(btn.dataset.preset);
        onFilterChange();
      });
    });

    document.getElementById('sort-toggle').addEventListener('click', () => {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      render();
    });

    document.getElementById('list-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.row-delete-btn');
      if (btn) handleDeleteClick(btn.dataset.id);
    });

    document.getElementById('fab-add').addEventListener('click', () => {
      App.FormScreen.openForm(null);
      App.Main.showScreen('form');
    });

    document.querySelectorAll('.today-slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        const timing = slot.dataset.timing;
        const record = findTodaySlotRecord(timing);
        if (record) {
          App.FormScreen.openForm(record.id);
        } else {
          App.FormScreen.openForm(null, { presetDate: App.Util.todayStr(), presetTiming: timing });
        }
        App.Main.showScreen('form');
      });
    });

    render();
  }

  function onFilterChange() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const result = App.Validation.validateDateRange(start, end);
    const errorEl = document.getElementById('filter-error');
    if (!result.valid) {
      errorEl.textContent = result.error;
      return;
    }
    errorEl.textContent = '';
    filter.start = start;
    filter.end = end;
    render();
  }

  return { init, render, getFilteredSorted };
})();
