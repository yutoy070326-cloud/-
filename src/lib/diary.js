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
    if (m.kind === 'book' && m.bookId) {
      if ((m.savedAt ?? 0) >= startedAt) readByBook[m.bookId] = (readByBook[m.bookId] ?? 0) + 1;
    } else if ((m.studiedAt ?? 0) >= startedAt) texts.push({ kind: m.kind, source: m.source, title: m.title, topic: m.topic, artist: m.artist });
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
  return { startedAt, minutes, bookRows, texts, masteredByLang, studiedByLang, masteredTotal, studiedTotal, wordsTotal };
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

// 達成したことの行（事実だけを書く。1行ずつ花丸が付く）。key が同じ行は、あとから内容を更新する（ページ数が増えたときなど）
export function factLines(sum, firstOfDay) {
  const lines = [];
  for (const b of sum.bookRows) lines.push({ key: `book:${b.id}`, text: t('note.book', '「{title}」を{read}ページ読んだ ({done}/{total})', { title: b.title, read: b.read, done: b.done, total: b.total }) });
  for (const x of sum.texts.slice(0, 6)) lines.push({ key: `text:${x.kind}:${x.title}`, text: textLine(x) });
  if (sum.texts.length > 6) lines.push({ key: 'text:more', text: t('note.text.more', 'ほか{n}件の文章を読んだ', { n: sum.texts.length - 6 }) });
  // 単語：学習した数と、そのうち覚えた（ステップ5まで終えた）数。2回目以降は「＋」で、その回に増えた分を書く
  if (sum.wordsTotal > 0) {
    const key = firstOfDay ? 'note.words.first' : 'note.words.more';
    const base = sum.masteredTotal > 0
      ? t(`${key}.m`, firstOfDay ? '{n}単語学習し、{m}単語覚えた！' : '＋{n}単語学習し、{m}単語覚えた！', { n: sum.wordsTotal, m: sum.masteredTotal })
      : t(key, firstOfDay ? '{n}単語学習した！' : '＋{n}単語学習した！', { n: sum.wordsTotal });
    lines.push({ key: 'words', text: base });
  }
  return lines;
}

// 学習時間の行（学習を終えたときに書く）。1回目は「頑張った」、2回目以降は「＋○分」
export function minutesLine(minutes, firstOfDay) {
  if (minutes < 1) return null;
  return {
    key: 'minutes',
    text: firstOfDay
      ? t('note.minutes.first', '{n}分間学習を頑張った！', { n: minutes })
      : t('note.minutes.more', '＋{n}分勉強した！', { n: minutes }),
  };
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

const sameDay = (a, b) => dayStr(a) === dayStr(b);
const noteIdOf = (startedAt) => `n-s-${startedAt}`;

// 今回の学習（スタート〜終了）の達成を、今日の達成ノートに書く（自動）。
// 新しく達成したことが見つかるたびに呼ぶ。同じ日に何回も学習した場合は、前の回に書いた行はくり返さず、
// 学習時間と単語数は「その回に増えた分」を書く。finish=true のときは、学習時間の行も書く。
// 返り値: { note, added: [新しく書いた／更新した行], first: その日の1回目か } | null
export function syncSessionNote({ finish = false, now = Date.now() } = {}) {
  const s = loadSession();
  if (!s) return null;
  const sum = computeSummary(s.startedAt, now);
  const id = noteIdOf(s.startedAt);
  const all = loadNotes();
  const existing = all.find((n) => n.id === id);
  const others = all.filter((n) => n.id !== id && sameDay(n.at, now));
  const first = !others.some((n) => n.finished); // その日の1回目の学習か
  const prior = new Set(others.flatMap((n) => n.lines.map((l) => l.text)));
  const wanted = factLines(sum, first).filter((l) => l.key === 'words' || !prior.has(l.text)); // 前の回と同じ事実は書かない
  if (finish) {
    const ml = minutesLine(sum.minutes, first);
    if (ml) wanted.push(ml);
  }
  const lines = existing ? [...existing.lines] : [];
  const added = [];
  for (const w of wanted) {
    const i = lines.findIndex((l) => l.key === w.key);
    if (i >= 0) {
      if (lines[i].text !== w.text) { lines[i] = { ...lines[i], text: w.text }; added.push(lines[i]); }
    } else if (!lines.some((l) => l.text === w.text)) {
      lines.push(w);
      added.push(w);
    }
  }
  if (lines.length === 0) return { note: existing ?? null, added, first, sum };
  const note = {
    ...(existing ?? { id, at: now, diary: '', medalIds: [] }),
    lines,
    stats: { minutes: sum.minutes, studied: sum.wordsTotal, mastered: sum.masteredTotal },
    finished: finish || !!existing?.finished,
  };
  writeJson(NOTES_KEY, [note, ...all.filter((n) => n.id !== id)].slice(0, 1000));
  return { note, added, first, sum };
}

// 学習を終える：ノートを仕上げて、メダルを保存する。返り値: { note, medals, sum }
export function finishSession(now = Date.now()) {
  const s = loadSession();
  recordStudy(now); // 学習を終えた日も「続けた日」に数える
  const res = syncSessionNote({ finish: true, now });
  const sum = res?.sum ?? computeSummary(s?.startedAt ?? new Date(now).setHours(0, 0, 0, 0), now);
  sum.streak = streakDays(now);
  const medals = newMedals(sum, loadMedals(), now);
  if (medals.length) writeJson(MEDALS_KEY, [...loadMedals(), ...medals]);
  if (res?.note && medals.length) {
    const notes = loadNotes().map((n) => (n.id === res.note.id ? { ...n, medalIds: [...(n.medalIds ?? []), ...medals.map((m) => m.id)] } : n));
    writeJson(NOTES_KEY, notes);
  }
  return { note: res?.note ?? null, noteId: res?.note?.id ?? noteIdOf(s?.startedAt ?? now), medals, sum, first: res?.first ?? true };
}

// 自分で書いた「達成したこと」と、一言日記を、ノートに足す（ノートがまだ無いときは、書いた内容があれば作る）
export function updateNote(id, { ownLines = [], diary = '' }, now = Date.now()) {
  const own = ownLines.map((x) => String(x).trim()).filter(Boolean);
  const text = String(diary).trim();
  const notes = loadNotes();
  if (!id || !notes.some((n) => n.id === id)) {
    if (own.length === 0 && !text) return;
    notes.unshift({ id: id || `n-${now}`, at: now, lines: own.map((x) => ({ text: x, own: true })), diary: text, medalIds: [], finished: true });
    writeJson(NOTES_KEY, notes.slice(0, 1000));
    return;
  }
  writeJson(NOTES_KEY, notes.map((n) => (n.id === id ? { ...n, lines: [...n.lines, ...own.map((x) => ({ text: x, own: true }))], diary: text || n.diary || '' } : n)));
}

// ある日（または全期間）の合計：総学習時間・学習した単語数・覚えた単語数
export function totalsOf(notes) {
  const sum = { minutes: 0, studied: 0, mastered: 0 };
  for (const n of notes) {
    sum.minutes += n.stats?.minutes ?? 0;
    sum.studied += n.stats?.studied ?? 0;
    sum.mastered += n.stats?.mastered ?? 0;
  }
  return sum;
}

// メダルアルバムを見たら「NEW」を外す
export function markMedalsSeen() {
  const list = readJson(MEDALS_KEY, []);
  if (Array.isArray(list) && list.some((m) => m.seen === false)) writeJson(MEDALS_KEY, list.map((m) => ({ ...m, seen: true })));
}
