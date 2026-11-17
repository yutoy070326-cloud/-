// 学習の記録：セッション（スタート〜終了）・達成ノート・記念メダル。
// ノートとメダルは lingo-reader:*:v1（バックアップ対象）。セッションは端末ごとの状態（ハイフン区切り）。
import { loadMaterials, loadBooks, loadWordbook, bookProgress } from './storage.js';
import { langName } from './storyAI.js';
import { streakDays, recordStudy } from './studyLog.js';

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
  // 今回さわった単語（保存した／復習した）。ステップ5まで終えて習得した単語は「覚えた」、まだの単語は「勉強した」
  const masteredByLang = {};
  const studiedByLang = {};
  for (const w of loadWordbook()) {
    const touched = (w.savedAt ?? 0) >= startedAt || (w.lastReviewedAt ?? 0) >= startedAt;
    if (!touched) continue;
    const target = w.mastered && (w.lastReviewedAt ?? 0) >= startedAt ? masteredByLang : studiedByLang;
    target[w.lang] = (target[w.lang] ?? 0) + 1;
  }
  const sumOf = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const masteredTotal = sumOf(masteredByLang);
  const studiedTotal = sumOf(studiedByLang);
  const wordsTotal = masteredTotal + studiedTotal;
  recordStudy(now); // 学習を終えた日も「続けた日」に数える
  const streak = streakDays(now);
  return { startedAt, minutes, bookRows, masteredByLang, studiedByLang, masteredTotal, studiedTotal, wordsTotal, streak };
}

// 達成ノートの行（1行ずつ花丸が付く）
export function buildLines(sum) {
  const lines = [];
  const detail = (o) => Object.entries(o).filter(([, n]) => n > 0).map(([l, n]) => `${langName(l)}：${n}単語`).join(' ');
  for (const b of sum.bookRows) lines.push({ text: `「${b.title}」を${b.read}ページ読んだ (${b.done}/${b.total})` });
  if (sum.masteredTotal > 0) lines.push({ text: `単語を${sum.masteredTotal}単語覚えた（${detail(sum.masteredByLang)}）` });
  if (sum.studiedTotal > 0) lines.push({ text: `単語を${sum.studiedTotal}単語勉強した（${detail(sum.studiedByLang)}）` });
  if (sum.minutes >= 10) lines.push({ text: `${sum.minutes}分間、学習をがんばった` });
  if (lines.length === 0) lines.push({ text: '今日も学習をはじめた' });
  return lines;
}

// ---- 記念メダル ----
// look: メダルの見た目（色と飾りの派手さ）。続けた日数が増えるほど、進化して派手になる
export const MEDAL_TIERS = [
  { id: 'streak-3', emoji: '🪷', look: 'bronze', title: '三日坊主メダル', desc: '3日つづけた', test: (s) => s.streak >= 3 },
  { id: 'streak-4', emoji: '💪', look: 'bronze deco', title: '三日坊主じゃない‼️メダル', desc: '4日つづけた', test: (s) => s.streak >= 4 },
  { id: 'streak-30', emoji: '🔥', look: 'silver', title: '三十日小僧メダル', desc: '30日つづけた', test: (s) => s.streak >= 30 },
  { id: 'streak-90', emoji: '🌸', look: 'gold deco', title: '三ヶ月沙弥メダル', desc: '3か月（90日）つづけた', test: (s) => s.streak >= 90 },
  { id: 'streak-1095', emoji: '👑', look: 'rainbow deco', title: '三年和尚メダル', desc: '3年（1095日）つづけた', test: (s) => s.streak >= 1095 },
  { id: 'time-30', emoji: '⏱️', look: 'gold', title: '30分学習', desc: '1回の学習で30分がんばった', test: (s) => s.minutes >= 30 },
  { id: 'time-60', emoji: '⌛', look: 'gold deco', title: '1時間学習', desc: '1回の学習で60分がんばった', test: (s) => s.minutes >= 60 },
  { id: 'words-20', emoji: '📝', look: 'gold', title: '20単語', desc: '1回の学習で20単語を学んだ', test: (s) => s.wordsTotal >= 20 },
  { id: 'words-50', emoji: '📚', look: 'gold deco', title: '50単語', desc: '1回の学習で50単語を学んだ', test: (s) => s.wordsTotal >= 50 },
  { id: 'words-100', emoji: '🏆', look: 'rainbow deco', title: '100単語', desc: '1回の学習で100単語を学んだ', test: (s) => s.wordsTotal >= 100 },
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
    if (b.finished && !owned.has(`book-${b.id}`)) out.push({ id: `book-${b.id}`, kind: 'book', emoji: '📖', look: 'gold', title: `${b.title} 読了`, desc: `${b.total}ページ、最後まで読んだ`, at: now, seen: false });
  }
  for (const t of MEDAL_TIERS) {
    if (t.test(sum) && !owned.has(t.id)) out.push({ id: t.id, kind: 'tier', emoji: t.emoji, look: t.look, title: t.title, desc: t.desc, at: now, seen: false });
  }
  return out;
}

// ノートとメダルを保存する（終了ボタンを押した時点で保存。演出の途中で閉じても残る）。返り値: ノートの id
export function saveFinish(lines, medals, now = Date.now()) {
  const notes = loadNotes();
  const id = `n-${now}`;
  notes.unshift({ id, at: now, lines, medalIds: medals.map((m) => m.id) });
  writeJson(NOTES_KEY, notes.slice(0, 500));
  if (medals.length) writeJson(MEDALS_KEY, [...loadMedals(), ...medals]);
  return id;
}

// 自分で書いた「達成したこと」と、一言日記を、ノートに足す
export function updateNote(id, { ownLines = [], diary = '' }) {
  const notes = loadNotes().map((n) => (n.id === id ? { ...n, lines: [...n.lines, ...ownLines.map((text) => ({ text, own: true }))], diary: String(diary).trim() } : n));
  writeJson(NOTES_KEY, notes);
}

// メダルアルバムを見たら「NEW」を外す
export function markMedalsSeen() {
  const list = loadMedals();
  if (list.some((m) => m.seen === false)) writeJson(MEDALS_KEY, list.map((m) => ({ ...m, seen: true })));
}
