/* Settings screen: profile, print options, export/import, delete-all. (§6.7, §6.8) */
window.App = window.App || {};

App.SettingsScreen = (function () {
  function loadFieldsFromSettings() {
    const s = App.Main.getSettings();
    document.getElementById('setting-name').value = s.name || '';
    document.getElementById('setting-fontsize').value = s.printFontSize || 'standard';
    document.getElementById('setting-pagenum').checked = !!s.showPageNumber;
    document.getElementById('setting-autofit').checked = s.autoFit !== false;
    document.getElementById('setting-defaultsort').value = s.defaultSort || 'desc';
  }

  function persistSetting(key, value) {
    App.Main.updateSettings({ [key]: value });
  }

  async function handleExportJSON() {
    const result = await App.Storage.exportJSON(App.Main.getData());
    if (result === 'cancelled') return;
    App.UI.showToast(result === 'shared' ? '共有メニューから送信先を選んでください' : 'JSONをエクスポートしました', 'success');
  }

  async function handleExportCSV() {
    const result = await App.Storage.exportCSV(App.Main.getRecords());
    if (result === 'cancelled') return;
    App.UI.showToast(result === 'shared' ? '共有メニューから送信先を選んでください' : 'CSVをエクスポートしました', 'success');
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    const mergeChoice = await App.UI.confirmDialog({
      title: 'インポート方法の選択',
      message: '既存データと「マージ」しますか？「キャンセル」を選ぶと中止します。OKでマージ、置換したい場合は先に全削除してからインポートしてください。',
      confirmLabel: 'マージして復元',
      cancelLabel: '中止',
    });
    if (!mergeChoice) return;

    const text = await file.text();
    const result = App.Storage.importJSON(text, App.Main.getData(), 'merge');
    if (!result.success) {
      App.UI.showToast(result.error, 'error');
      return;
    }
    App.Main.replaceData(result.data);
    App.UI.showToast('データを復元しました', 'success');
    loadFieldsFromSettings();
    App.ListScreen.render();
  }

  async function handleDeleteAll() {
    const first = await App.UI.confirmDialog({
      title: '全削除の確認',
      message: 'すべての記録を削除します。事前にエクスポートしましたか？この操作は元に戻せません。',
      confirmLabel: '次へ',
      danger: true,
    });
    if (!first) return;

    const second = await App.UI.confirmDialog({
      title: '最終確認',
      message: '本当にすべての記録を削除しますか？この操作は取り消せません。',
      confirmLabel: 'すべて削除する',
      danger: true,
    });
    if (!second) return;

    App.Main.deleteAllRecords();
    App.UI.showToast('すべての記録を削除しました', 'success');
    App.ListScreen.render();
  }

  function init() {
    loadFieldsFromSettings();

    document.getElementById('setting-name').addEventListener('change', (e) => persistSetting('name', e.target.value));
    document.getElementById('setting-fontsize').addEventListener('change', (e) => persistSetting('printFontSize', e.target.value));
    document.getElementById('setting-pagenum').addEventListener('change', (e) => persistSetting('showPageNumber', e.target.checked));
    document.getElementById('setting-autofit').addEventListener('change', (e) => persistSetting('autoFit', e.target.checked));
    document.getElementById('setting-defaultsort').addEventListener('change', (e) => persistSetting('defaultSort', e.target.value));

    document.getElementById('export-json-btn').addEventListener('click', handleExportJSON);
    document.getElementById('export-csv-btn').addEventListener('click', handleExportCSV);
    document.getElementById('import-file-input').addEventListener('change', handleImportFile);
    document.getElementById('delete-all-btn').addEventListener('click', handleDeleteAll);
    document.getElementById('settings-back').addEventListener('click', () => App.Main.showScreen('list'));
  }

  return { init };
})();
