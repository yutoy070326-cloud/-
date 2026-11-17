// 学習の記録：セッション（スタート〜終了）・達成ノート・記念メダル。
// ノートとメダルは lingo-reader:*:v1（バックアップ対象）。セッションは端末ごとの状態（ハイフン区切り）。
import { loadMaterials, loadBooks, loadWordbook, bookProgress } from './storage.js';
import { langName } from './storyAI.js';
import { streakDays, recordStudy, dayStr } from './studyLog.js';
import { t } from './i18n.js';

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
  const texts = []; // 本のページ以外で、今回読んだ文章
  for (const m of loadMaterials()) {
    const at = m.lastStudiedAt ?? m.savedAt ?? 0;
    if (at < startedAt) continue;
    if (m.kind === 'book' && m.bookId) readByBook[m.bookId] = (readByBook[m.bookId] ?? 0) + 1;
    else texts.push({ kind: m.kind, source: m.source, title: m.title, topic: m.topic, artist: m.artist });
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
  return { startedAt, minutes, bookRows, texts, masteredByLang, studiedByLang, masteredTotal, studiedTotal, wordsTotal, streak };
}

// 文章1つぶんの「事実」の一行（花丸が付く）
export function textLine(x) {
  const title = x.title;
  if (x.kind === 'article') {
    return x.topic
      ? t('note.article.topic', '{topic}についての記事「{title}」を読んだ', { topic: x.topic, title })
      : t('note.article', '記事「{title}」を読んだ', { title });
  }
  if (x.kind === 'lyrics') {
    return x.artist
      ? t('note.lyrics.artist', '{artist}の「{title}」の歌詞を理解した', { artist: x.artist, title })
      : t('note.lyrics', '「{title}」の歌詞を理解した', { title });
  }
  if (x.kind === 'exam') return t('note.exam', '長文問題「{title}」を読んだ', { title });
  if (x.source === 'ai') return t('note.ai', 'AIが作った物語「{title}」を読んだ', { title });
  return t('note.text', '文章「{title}」を読んだ', { title });
}

// 達成ノートの行（事実だけを書く。1行ずつ花丸が付く）。
// existing: 同じ日のノートにすでに書いた行。重複する行（「今日も学習をはじめた」など）は書かない
export function buildLines(sum, existing = new Set()) {
  const lines = [];
  const detail = (o) => Object.entries(o).filter(([, n]) => n > 0).map(([l, n]) => t('note.words.lang', '{lang}：{n}単語', { lang: langName(l), n })).join(' ');
  for (const b of sum.bookRows) lines.push(t('note.book', '「{title}」を{read}ページ読んだ ({done}/{total})', { title: b.title, read: b.read, done: b.done, total: b.total }));
  for (const x of sum.texts.slice(0, 6)) lines.push(textLine(x));
  if (sum.texts.length > 6) lines.push(t('note.text.more', 'ほか{n}件の文章を読んだ', { n: sum.texts.length - 6 }));
  if (sum.masteredTotal > 0) lines.push(t('note.mastered', '単語を{n}単語覚えた（{detail}）', { n: sum.masteredTotal, detail: detail(sum.masteredByLang) }));
  if (sum.studiedTotal > 0) lines.push(t('note.studied', '単語を{n}単語勉強した（{detail}）', { n: sum.studiedTotal, detail: detail(sum.studiedByLang) }));
  if (sum.minutes >= 10) lines.push(t('note.minutes', '{n}分間、学習をがんばった', { n: sum.minutes }));
  if (lines.length === 0) lines.push(t('note.started', '今日も学習をはじめた'));
  const seen = new Set(existing);
  return lines.filter((text) => (seen.has(text) ? false : (seen.add(text), true))).map((text) => ({ text }));
}

// ---- 記念メダル ----
// look: メダルの見た目（色と飾りの派手さ）。続けた日数が増えるほど、進化して派手になる。名前はすべて「〜メダル」
export const MEDAL_TIERS = [
  { id: 'streak-3', emoji: '🪷', look: 'bronze', title: '三日坊主メダル', desc: '3日つづけた', test: (s) => s.streak >= 3 },
  { id: 'streak-4', emoji: '💪', look: 'bronze deco', title: '三日坊主じゃない‼️メダル', desc: '4日つづけた', test: (s) => s.streak >= 4 },
  { id: 'streak-30', emoji: '🔥', look: 'silver', title: '三十日小僧メダル', desc: '30日つづけた', test: (s) => s.streak >= 30 },
  { id: 'streak-90', emoji: '🌸', look: 'gold deco', title: '三ヶ月沙弥メダル', desc: '3か月（90日）つづけた', test: (s) => s.streak >= 90 },
  { id: 'streak-1095', emoji: '👑', look: 'rainbow deco', title: '三年和尚メダル', desc: '3年（1095日）つづけた', test: (s) => s.streak >= 1095 },
  { id: 'time-30', emoji: '⏱️', look: 'gold', title: '30分学習メダル', desc: '1回の学習で30分がんばった', test: (s) => s.minutes >= 30 },
  { id: 'time-60', emoji: '⌛', look: 'gold deco', title: '1時間学習メダル', desc: '1回の学習で60分がんばった', test: (s) => s.minutes >= 60 },
  { id: 'words-20', emoji: '📝', look: 'gold', title: '20単語メダル', desc: '1回の学習で20単語を学んだ', test: (s) => s.wordsTotal >= 20 },
  { id: 'words-50', emoji: '📚', look: 'gold deco', title: '50単語メダル', desc: '1回の学習で50単語を学んだ', test: (s) => s.wordsTotal >= 50 },
  { id: 'words-100', emoji: '🏆', look: 'rainbow deco', title: '100単語メダル', desc: '1回の学習で100単語を学んだ', test: (s) => s.wordsTotal >= 100 },
];

// 表示用の名前と説明（表示言語に合わせる）。読破メダルは「題名」を「」で囲む
export function medalName(m) {
  if (m.kind === 'book') return t('medal.book', '「{title}」読破メダル', { title: m.bookTitle ?? '' });
  const tier = MEDAL_TIERS.find((x) => x.id === m.id);
  return tier ? t(`medal.${tier.id}`, tier.title) : String(m.title ?? '');
}
export function medalDesc(m) {
  if (m.kind === 'book') return t('medal.book.desc', '{n}ページ、最後まで読んだ', { n: m.pages ?? '' });
  const tier = MEDAL_TIERS.find((x) => x.id === m.id);
  return tier ? t(`medal.${tier.id}.desc`, tier.desc) : String(m.desc ?? '');
}

// 保存データを新しい形に直す（以前の「〜 読了」は「「題名」読破メダル」へ）
function migrateMedal(m) {
  if (m.kind === 'book') {
    const bookTitle = m.bookTitle ?? String(m.title ?? '').replace(/^「(.*)」読破メダル$/, '$1').replace(/ 読了$/, '');
    const pages = (m.pages ?? parseInt(String(m.desc ?? ''), 10)) || undefined;
    return { ...m, bookTitle, pages };
  }
  return m;
}
export const loadMedals = () => {
  const a = readJson(MEDALS_KEY, []);
  return Array.isArray(a) ? a.filter((m) => m && m.id).map(migrateMedal) : [];
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
    if (b.finished && !owned.has(`book-${b.id}`)) out.push({ id: `book-${b.id}`, kind: 'book', emoji: '📖', look: 'gold', bookTitle: b.title, pages: b.total, at: now, seen: false });
  }
  for (const tier of MEDAL_TIERS) {
    if (tier.test(sum) && !owned.has(tier.id)) out.push({ id: tier.id, kind: 'tier', emoji: tier.emoji, look: tier.look, at: now, seen: false });
  }
  return out;
}

// 同じ日のノートに、すでに書いた行（重複を避けるため）
export function todayLineTexts(now = Date.now()) {
  const day = dayStr(now);
  const set = new Set();
  for (const n of loadNotes()) if (dayStr(n.at) === day) for (const l of n.lines) set.add(l.text);
  return set;
}

// ノートとメダルを保存する（終了ボタンを押した時点で保存。演出の途中で閉じても残る）。
// 新しく書く行がないとき（今日すでに書いた内容だけ）は、ノートは作らず null を返す。返り値: ノートの id | null
export function saveFinish(lines, medals, now = Date.now()) {
  let id = null;
  if (lines.length > 0) {
    const notes = loadNotes();
    id = `n-${now}`;
    notes.unshift({ id, at: now, lines, medalIds: medals.map((m) => m.id) });
    writeJson(NOTES_KEY, notes.slice(0, 1000));
  }
  if (medals.length) writeJson(MEDALS_KEY, [...loadMedals(), ...medals]);
  return id;
}

// 自分で書いた「達成したこと」と、一言日記を、ノートに足す（ノートがまだ無いときは、書いた内容があれば作る）
export function updateNote(id, { ownLines = [], diary = '' }, now = Date.now()) {
  const own = ownLines.map((x) => String(x).trim()).filter(Boolean);
  const text = String(diary).trim();
  const notes = loadNotes();
  if (!id || !notes.some((n) => n.id === id)) {
    if (own.length === 0 && !text) return;
    notes.unshift({ id: `n-${now}`, at: now, lines: own.map((x) => ({ text: x, own: true })), diary: text, medalIds: [] });
    writeJson(NOTES_KEY, notes.slice(0, 1000));
    return;
  }
  writeJson(NOTES_KEY, notes.map((n) => (n.id === id ? { ...n, lines: [...n.lines, ...own.map((x) => ({ text: x, own: true }))], diary: text } : n)));
}

// メダルアルバムを見たら「NEW」を外す
export function markMedalsSeen() {
  const list = readJson(MEDALS_KEY, []);
  if (Array.isArray(list) && list.some((m) => m.seen === false)) writeJson(MEDALS_KEY, list.map((m) => ({ ...m, seen: true })));
}
