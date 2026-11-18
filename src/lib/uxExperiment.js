// ボタン配置の比較実験（ベータ版テスト用）。
//  ・戻るボタン：左上（従来）と左下の両方を出す
//  ・単語の保存ボタン：右上（従来）と下側の中央の両方を出す
// 押された回数を、この端末の中で数える。一定期間（EXPERIMENT_DAYS 日）がたったら、使われた回数が少ない方を自動で消す
// （同じ回数なら、従来の位置を残す）。複数の端末の結果は、設定の「ベータ版テスト」の「結果をコピー」で集められる
// （サーバーが無いので、端末をまたいだ自動の集計はできない）。
const KEY = 'lingo-reader-ux:v1'; // 端末設定（バックアップ・リセット対象外）
export const EXPERIMENT_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

const days = () => {
  try {
    const v = Number(localStorage.getItem('lingo-reader-debug-ux-days')); // テスト用：期間を短くできる
    return v > 0 ? v : EXPERIMENT_DAYS;
  } catch {
    return EXPERIMENT_DAYS;
  }
};

const fresh = (now) => ({ startedAt: now, counts: { back: { top: 0, bottom: 0 }, save: { top: 0, bottom: 0 } }, decided: { back: null, save: null } });

export function loadUx(now = Date.now()) {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s.startedAt === 'number') {
      return { ...fresh(s.startedAt), ...s, counts: { ...fresh(0).counts, ...(s.counts || {}) }, decided: { ...fresh(0).decided, ...(s.decided || {}) } };
    }
  } catch { /* ignore */ }
  const s = fresh(now);
  saveUx(s);
  return s;
}
function saveUx(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// kind: 'back' | 'save'、where: 'top' | 'bottom'
export function recordUse(kind, where) {
  const s = loadUx();
  if (s.decided[kind]) return;
  s.counts[kind][where] = (s.counts[kind][where] ?? 0) + 1;
  saveUx(s);
}

// 期間がたっていたら、使われた回数が少ない方を消す（決定を保存）。決定が変わったら true
export function decideIfDue(now = Date.now()) {
  const s = loadUx(now);
  if (now - s.startedAt < days() * DAY) return false;
  let changed = false;
  for (const kind of ['back', 'save']) {
    if (s.decided[kind]) continue;
    const c = s.counts[kind];
    s.decided[kind] = (c.bottom ?? 0) > (c.top ?? 0) ? 'bottom' : 'top'; // 同数なら、従来の位置
    changed = true;
  }
  if (changed) saveUx(s);
  return changed;
}

// 決定済みなら、残した位置だけ表示する。実験中は両方
export function uxVisible(kind, where) {
  const d = loadUx().decided[kind];
  return !d || d === where;
}

export function uxSummary(now = Date.now()) {
  const s = loadUx(now);
  const left = Math.max(0, Math.ceil((s.startedAt + days() * DAY - now) / DAY));
  return { ...s, daysLeft: left, periodDays: days() };
}

// 設定の「結果をコピー」用（個人情報は入っていない）
export function uxResultJson() {
  const s = uxSummary();
  return JSON.stringify({ experiment: 'back-and-save-position', startedAt: new Date(s.startedAt).toISOString(), periodDays: s.periodDays, counts: s.counts, decided: s.decided }, null, 2);
}
