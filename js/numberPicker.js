/* Number input component combining: big display, numeric keyboard, wheel picker, ±stepper. (§8.1) */
window.App = window.App || {};

App.NumberPicker = (function () {
  const ITEM_HEIGHT = 40;
  const LONG_PRESS_INITIAL_MS = 450;
  const LONG_PRESS_REPEAT_MS = 90;

  // opts: { key, label, min, max, wheelMin, wheelMax, initial }
  function create(opts) {
    const { key, label, min, max, wheelMin, wheelMax } = opts;
    let value = App.Util.clamp(opts.initial, min, max);

    const wrap = document.createElement('div');
    wrap.className = 'numfield';
    wrap.innerHTML = `
      <label class="numfield-label" for="input-${key}">${App.Util.escapeHtml(label)}</label>
      <div class="numfield-controls">
        <button type="button" class="stepper-btn minus" aria-label="${App.Util.escapeHtml(label)}を減らす">−</button>
        <input type="number" inputmode="numeric" id="input-${key}" class="numfield-input" aria-label="${App.Util.escapeHtml(label)}の値">
        <button type="button" class="stepper-btn plus" aria-label="${App.Util.escapeHtml(label)}を増やす">＋</button>
      </div>
      <div class="wheel" role="slider" tabindex="0"
           aria-label="${App.Util.escapeHtml(label)}ホイール選択"
           aria-valuemin="${wheelMin}" aria-valuemax="${wheelMax}">
        <div class="wheel-track"></div>
        <div class="wheel-highlight"></div>
      </div>
    `;

    const input = wrap.querySelector('.numfield-input');
    const minusBtn = wrap.querySelector('.stepper-btn.minus');
    const plusBtn = wrap.querySelector('.stepper-btn.plus');
    const wheel = wrap.querySelector('.wheel');
    const track = wrap.querySelector('.wheel-track');

    // Build wheel items once; spacer items top/bottom let edge values center.
    const spacerCount = 2;
    for (let i = 0; i < spacerCount; i++) {
      const spacer = document.createElement('div');
      spacer.className = 'wheel-item';
      spacer.style.visibility = 'hidden';
      track.appendChild(spacer);
    }
    for (let v = wheelMin; v <= wheelMax; v++) {
      const item = document.createElement('div');
      item.className = 'wheel-item';
      item.dataset.value = String(v);
      item.textContent = String(v);
      track.appendChild(item);
    }
    for (let i = 0; i < spacerCount; i++) {
      const spacer = document.createElement('div');
      spacer.className = 'wheel-item';
      spacer.style.visibility = 'hidden';
      track.appendChild(spacer);
    }

    const changeListeners = [];
    let syncingFromCode = false;
    let scrollEndTimer = null;

    function notifyChange() {
      changeListeners.forEach((cb) => cb(value));
    }

    function highlightWheelItem() {
      track.querySelectorAll('.wheel-item.selected').forEach((el) => el.classList.remove('selected'));
      const target = track.querySelector(`.wheel-item[data-value="${value}"]`);
      if (target) target.classList.add('selected');
    }

    function scrollWheelTo(v, smooth) {
      const clampedV = App.Util.clamp(v, wheelMin, wheelMax);
      const index = clampedV - wheelMin;
      const top = index * ITEM_HEIGHT;
      // Mark this as a programmatic scroll so the scroll listener below doesn't
      // mistake the resulting scroll event for user input and overwrite `value`
      // (this matters when v sits outside the wheel's narrower range, e.g. a
      // typed 300 when the wheel only spans 70-250 — the clamped scroll position
      // must not stomp the real, validatable, out-of-range value).
      syncingFromCode = true;
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => { syncingFromCode = false; }, 200);
      wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
    }

    function render() {
      input.value = Number.isFinite(value) ? String(value) : '';
      highlightWheelItem();
      wheel.setAttribute('aria-valuenow', String(App.Util.clamp(Number.isFinite(value) ? value : wheelMin, wheelMin, wheelMax)));
    }

    // Programmatic set (defaults, edit-load): always a known-valid value, so clamping is safe here.
    function setValue(v, opts2) {
      const clamped = App.Util.clamp(Math.round(v), min, max);
      const changed = clamped !== value;
      value = clamped;
      render();
      if (!opts2 || opts2.scrollWheel !== false) {
        scrollWheelTo(value, !!(opts2 && opts2.smooth));
      }
      if (changed) notifyChange();
    }

    // Keyboard input must NOT silently clamp out-of-range digits — validation (§10)
    // needs to see the real typed value so it can reject it and show an error.
    function applyTypedValue() {
      const digitsOnly = input.value.replace(/[^0-9]/g, '');
      if (input.value !== digitsOnly) input.value = digitsOnly;
      const parsed = digitsOnly === '' ? NaN : parseInt(digitsOnly, 10);
      const changed = parsed !== value;
      value = parsed;
      highlightWheelItem();
      if (Number.isFinite(parsed)) {
        scrollWheelTo(parsed, false);
        wheel.setAttribute('aria-valuenow', String(App.Util.clamp(parsed, wheelMin, wheelMax)));
      }
      if (changed) notifyChange();
    }

    input.addEventListener('input', applyTypedValue);

    // --- stepper buttons (with long-press repeat) ---
    function attachStepper(btn, delta) {
      let repeatTimer = null;
      let initialTimer = null;

      function step() {
        const base = Number.isFinite(value) ? value : min;
        setValue(base + delta, { smooth: true });
      }

      function start(e) {
        e.preventDefault();
        step();
        initialTimer = setTimeout(() => {
          repeatTimer = setInterval(step, LONG_PRESS_REPEAT_MS);
        }, LONG_PRESS_INITIAL_MS);
      }

      function stop() {
        clearTimeout(initialTimer);
        clearInterval(repeatTimer);
      }

      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      btn.addEventListener('pointercancel', stop);
    }
    attachStepper(minusBtn, -1);
    attachStepper(plusBtn, 1);

    // --- wheel scroll ---
    let scrollRaf = null;

    wheel.addEventListener('scroll', () => {
      // Ignore scroll events caused by our own scrollWheelTo() calls — see note there.
      if (syncingFromCode) return;
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        const index = Math.round(wheel.scrollTop / ITEM_HEIGHT);
        const v = wheelMin + index;
        if (v !== value) {
          value = App.Util.clamp(v, min, max);
          input.value = String(value);
          highlightWheelItem();
          wheel.setAttribute('aria-valuenow', String(App.Util.clamp(value, wheelMin, wheelMax)));
          notifyChange();
        }
      });
    });

    wheel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); setValue(value - 1, { smooth: true }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setValue(value + 1, { smooth: true }); }
    });

    // Initial paint after layout settles so scrollTo works correctly.
    setTimeout(() => render(), 0);
    setTimeout(() => scrollWheelTo(value, false), 0);

    return {
      el: wrap,
      get: () => value,
      set: (v) => setValue(v, { smooth: false }),
      onChange: (cb) => changeListeners.push(cb),
    };
  }

  return { create };
})();
