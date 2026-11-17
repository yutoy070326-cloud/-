// 学習の記録：セッション（スタート〜終了）・達成ノート・記念メダル。
// ノートとメダルは lingo-reader:*:v1（バックアップ対象）。セッションは端末ごとの状態（ハイフン区切り）。
import { loadMaterials, loadBooks, loadWordbook, bookProgress } from './storage.js';
import { langName } from './storyAI.js';

const SESSION_KEY = 'lingo-reader-session:v1';
export const NOTES_KEY = 'lingo-reader:notes:v1';
export const MEDALS_KEY = 'lingo-reader:medals:v1';

const readJson = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, v) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 保存できなくても動作は続ける */
  }
};

// ---- セッション ----
export const oppositeChar = (c) => (c === 'boy' ? 'girl' : 'boy');

// スタート時：キャラクター（男の子／女の子）をランダムに決めて、開始時刻と一緒に保持する
export function startSession(now = Date.now(), rng = Math.random) {
  const s = { startedAt: now, char: rng() < 0.5 ? 'boy' : 'girl' };
  writeJson(SESSION_KEY, s);
  return s;
}
export const loadSession = () => {
  const s = readJson(SESSION_KEY, null);
  return s && typeof s.startedAt === 'number' && (s.char === 'boy' || s.char === 'girl') ? s : null;
};
export const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
};

// ---- このセッションで達成したこと ----
export function computeSummary(startedAt, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - startedAt) / 60000));
  const books = loadBooks();
  const readByBook = {};
  for (const m of loadMaterials()) {
    if (m.kind === 'book' && m.bookId && (m.savedAt ?? 0) >= startedAt) readByBook[m.bookId] = (readByBook[m.bookId] ?? 0) + 1;
  }
  const bookRows = Object.entries(readByBook)
    .map(([id, read]) => {
      const b = books.find((x) => x.id === id);
      if (!b) return null;
      const p = bookProgress(b);
      return { id, title: b.title, read, done: p.done, total: p.total, finished: p.finished };
    })
    .filter(Boolean);
  const wordsByLang = {};
  for (const w of loadWordbook()) {
    if ((w.savedAt ?? 0) >= startedAt) wordsByLang[w.lang] = (wordsByLang[w.lang] ?? 0) + 1;
  }
  const wordsTotal = Object.values(wordsByLang).reduce((a, b) => a + b, 0);
  return { startedAt, minutes, bookRows, wordsByLang, wordsTotal };
}

// 達成ノートの行（1行ずつ花丸が付く）
export function buildLines(sum) {
  const lines = [];
  for (const b of sum.bookRows) lines.push({ text: `${b.title}を${b.read}ページ読んだ (${b.done}/${b.total})` });
  if (sum.wordsTotal > 0) {
    const detail = Object.entries(sum.wordsByLang).filter(([, n]) => n > 0).map(([l, n]) => `${langName(l)}：${n}単語`).join(' ');
    lines.push({ text: `単語を${sum.wordsTotal}単語覚えた（${detail}）` });
  }
  if (sum.minutes >= 10) lines.push({ text: `${sum.minutes}分間、学習をがんばった` });
  if (lines.length === 0) lines.push({ text: '今日も学習をはじめた' });
  return lines;
}

// ---- 記念メダル ----
export const MEDAL_TIERS = [
  { id: 'time-30', emoji: '⏱️', title: '30分学習', desc: '1回の学習で30分がんばった', test: (s) => s.minutes >= 30 },
  { id: 'time-60', emoji: '⌛', title: '1時間学習', desc: '1回の学習で60分がんばった', test: (s) => s.minutes >= 60 },
  { id: 'words-20', emoji: '📝', title: '20単語', desc: '1回の学習で20単語を保存した', test: (s) => s.wordsTotal >= 20 },
  { id: 'words-50', emoji: '📚', title: '50単語', desc: '1回の学習で50単語を保存した', test: (s) => s.wordsTotal >= 50 },
  { id: 'words-100', emoji: '🏆', title: '100単語', desc: '1回の学習で100単語を保存した', test: (s) => s.wordsTotal >= 100 },
];

export const loadMedals = () => {
  const a = readJson(MEDALS_KEY, []);
  return Array.isArray(a) ? a.filter((m) => m && m.id) : [];
};
export const loadNotes = () => {
  const a = readJson(NOTES_KEY, []);
  return Array.isArray(a) ? a.filter((n) => n && n.id && Array.isArray(n.lines)) : [];
};

// 今回のセッションで新しく獲得するメダル（すでに持っているものは除く）
export function newMedals(sum, have = loadMedals(), now = Date.now()) {
  const owned = new Set(have.map((m) => m.id));
  const out = [];
  for (const b of sum.bookRows) {
    if (b.finished && !owned.has(`book-${b.id}`)) out.push({ id: `book-${b.id}`, kind: 'book', emoji: '📖', title: `${b.title} 読了`, desc: `${b.total}ページ、最後まで読んだ`, at: now });
  }
  for (const t of MEDAL_TIERS) {
    if (t.test(sum) && !owned.has(t.id)) out.push({ id: t.id, kind: 'tier', emoji: t.emoji, title: t.title, desc: t.desc, at: now });
  }
  return out;
}

// ノートとメダルを保存する（終了ボタンを押した時点で保存。演出の途中で閉じても残る）
export function saveFinish(lines, medals, now = Date.now()) {
  const notes = loadNotes();
  notes.unshift({ id: `n-${now}`, at: now, lines, medalIds: medals.map((m) => m.id) });
  writeJson(NOTES_KEY, notes.slice(0, 500));
  if (medals.length) writeJson(MEDALS_KEY, [...loadMedals(), ...medals]);
}
