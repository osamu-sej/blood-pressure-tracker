/* Toast notifications + promise-based confirm dialog. */
window.App = window.App || {};

App.UI = (function () {
  const TOAST_DURATION_MS = 3000;

  function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' toast-' + type : '');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 200);
    }, TOAST_DURATION_MS);
  }

  // opts: { title, message, confirmLabel, cancelLabel, danger }
  // returns Promise<boolean>
  function confirmDialog(opts) {
    return new Promise((resolve) => {
      const root = document.getElementById('modal-root');
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
          <h3 id="modal-title">${App.Util.escapeHtml(opts.title || '確認')}</h3>
          <p>${App.Util.escapeHtml(opts.message || '')}</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" data-action="cancel">${App.Util.escapeHtml(opts.cancelLabel || 'キャンセル')}</button>
            <button type="button" class="${opts.danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${App.Util.escapeHtml(opts.confirmLabel || 'OK')}</button>
          </div>
        </div>
      `;

      function cleanup(result) {
        document.removeEventListener('keydown', onKeydown);
        overlay.remove();
        resolve(result);
      }

      function onKeydown(e) {
        if (e.key === 'Escape') cleanup(false);
      }

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => cleanup(true));

      document.addEventListener('keydown', onKeydown);
      root.appendChild(overlay);
      overlay.querySelector('[data-action="confirm"]').focus();
    });
  }

  return { showToast, confirmDialog };
})();
