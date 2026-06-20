/* Print preview screen. (§9 ★最重要) */
window.App = window.App || {};

App.PrintScreen = (function () {
  let filter = { start: '', end: '' };
  let sortDir = 'asc'; // print default = ascending (time order), per §6.5

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
    document.getElementById('print-filter-start').value = filter.start;
    document.getElementById('print-filter-end').value = filter.end;
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

  function periodLabel() {
    if (!filter.start && !filter.end) return '全期間';
    const start = filter.start ? App.Util.displayDate(filter.start) : '';
    const end = filter.end ? App.Util.displayDate(filter.end) : '';
    return `${start} 〜 ${end}`;
  }

  function applySettingsToPage() {
    const settings = App.Main.getSettings();
    const page = document.getElementById('print-page');
    page.classList.remove('fs-standard', 'fs-compact', 'fs-min', 'no-autofit');
    page.classList.add('fs-' + (settings.printFontSize || 'standard'));
    if (!settings.autoFit) page.classList.add('no-autofit');

    document.getElementById('print-pagenum-note').classList.toggle('hidden', !settings.showPageNumber);
  }

  function render() {
    const settings = App.Main.getSettings();
    applySettingsToPage();

    document.getElementById('print-meta-name').textContent = settings.name ? `氏名: ${settings.name}` : '';
    document.getElementById('print-meta-period').textContent = `期間: ${periodLabel()}`;
    document.getElementById('print-meta-issued').textContent = `出力日: ${App.Util.todayDisplayStr()}`;

    const records = getFilteredSorted();
    const tbody = document.getElementById('print-tbody');
    const table = document.getElementById('print-table');
    const emptyEl = document.getElementById('print-empty');

    tbody.innerHTML = '';
    if (records.length === 0) {
      table.classList.add('hidden');
      emptyEl.classList.remove('hidden');
    } else {
      table.classList.remove('hidden');
      emptyEl.classList.add('hidden');
      records.forEach((r) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${App.Util.displayDate(r.date)}</td>
          <td class="timing">${r.timing === 'morning' ? '朝' : '夜'}</td>
          <td class="num">${r.sbp}</td>
          <td class="num">${r.dbp}</td>
          <td class="num">${r.pr}</td>
          <td class="memo">${App.Util.escapeHtml(r.memo)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  function syncFromListFilter() {
    const listStart = document.getElementById('filter-start').value;
    const listEnd = document.getElementById('filter-end').value;
    filter.start = listStart;
    filter.end = listEnd;
    document.getElementById('print-filter-start').value = listStart;
    document.getElementById('print-filter-end').value = listEnd;
  }

  function onFilterChange() {
    const start = document.getElementById('print-filter-start').value;
    const end = document.getElementById('print-filter-end').value;
    const result = App.Validation.validateDateRange(start, end);
    const errorEl = document.getElementById('print-filter-error');
    if (!result.valid) {
      errorEl.textContent = result.error;
      return;
    }
    errorEl.textContent = '';
    filter.start = start;
    filter.end = end;
    render();
  }

  function init() {
    document.getElementById('print-filter-start').addEventListener('change', onFilterChange);
    document.getElementById('print-filter-end').addEventListener('change', onFilterChange);

    document.querySelectorAll('.preset-btn[data-target="print"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyPreset(btn.dataset.preset);
        onFilterChange();
      });
    });

    document.getElementById('print-sort-select').addEventListener('change', (e) => {
      sortDir = e.target.value;
      render();
    });

    document.getElementById('print-now-btn').addEventListener('click', () => window.print());
    document.getElementById('print-back').addEventListener('click', () => App.Main.showScreen('list'));
  }

  // Called whenever navigating into this screen so it reflects current data/settings.
  function onShow() {
    syncFromListFilter();
    document.getElementById('print-sort-select').value = sortDir;
    render();
  }

  return { init, render, onShow };
})();
