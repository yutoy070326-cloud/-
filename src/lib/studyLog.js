// 学習した日の記録（連続学習日数の計算用）。端末ごとの記録で、バックアップの対象外。
// 学習 = 復習カードに答えた／単語を保存した／ページ・文章を登録した
const KEY = 'lingo-reader-study:v1';

const pad = (n) => String(n).padStart(2, '0');
export const dayStr = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function loadStudyDays() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function recordStudy(now = Date.now()) {
  try {
    const days = loadStudyDays();
    const k = dayStr(now);
    if (days.includes(k)) return;
    days.push(k);
    localStorage.setItem(KEY, JSON.stringify(days.sort().slice(-400)));
  } catch {
    /* ignore */
  }
}

export const studiedToday = (now = Date.now()) => loadStudyDays().includes(dayStr(now));

// 連続日数。今日まだ学習していなくても、昨日まで続いていれば「継続中」として数える
export function streakDays(now = Date.now()) {
  const set = new Set(loadStudyDays());
  let t = now;
  if (!set.has(dayStr(t))) t -= 86400000;
  let n = 0;
  while (set.has(dayStr(t))) {
    n++;
    const d = new Date(t);
    d.setDate(d.getDate() - 1);
    t = d.getTime();
  }
  return n;
}
