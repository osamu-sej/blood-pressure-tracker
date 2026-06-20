/* Record + filter validation rules (requirements §10). */
window.App = window.App || {};

App.Validation = (function () {
  const RULES = {
    sbp: { min: 50, max: 300 },
    dbp: { min: 30, max: 200 },
    pr: { min: 30, max: 250 },
  };

  function isIntegerInRange(value, min, max) {
    return Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max;
  }

  // input: { date, timing, sbp, dbp, pr } where numeric fields may be NaN/undefined when empty.
  function validateRecord(input) {
    const errors = {};

    if (!input.date) {
      errors.date = '日付を入力してください';
    } else if (input.date > App.Util.todayStr()) {
      errors.date = '未来の日付は入力できません';
    }

    if (input.timing !== 'morning' && input.timing !== 'evening') {
      errors.timing = '朝・夜を選択してください';
    }

    if (!isIntegerInRange(input.sbp, RULES.sbp.min, RULES.sbp.max)) {
      errors.sbp = `収縮期血圧は${RULES.sbp.min}〜${RULES.sbp.max}の数字で入力してください`;
    }
    if (!isIntegerInRange(input.dbp, RULES.dbp.min, RULES.dbp.max)) {
      errors.dbp = `拡張期血圧は${RULES.dbp.min}〜${RULES.dbp.max}の数字で入力してください`;
    }
    if (!isIntegerInRange(input.pr, RULES.pr.min, RULES.pr.max)) {
      errors.pr = `脈拍は${RULES.pr.min}〜${RULES.pr.max}の数字で入力してください`;
    }

    let warning = null;
    if (!errors.sbp && !errors.dbp && input.dbp >= input.sbp) {
      warning = 'dbpGteSbp';
    }

    return { valid: Object.keys(errors).length === 0, errors, warning };
  }

  function validateDateRange(start, end) {
    if (start && end && start > end) {
      return { valid: false, error: '開始日は終了日より前に設定してください' };
    }
    return { valid: true, error: null };
  }

  return { RULES, validateRecord, validateDateRange };
})();
