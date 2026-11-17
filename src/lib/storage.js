// 単語帳の永続化（localStorage）。失敗してもアプリが落ちないよう try/catch。

import { newSrs, normalizeWord, applyPractice } from './srs.js';
import { healSources, textKey } from './folders.js';
import { recordStudy } from './studyLog.js';
import { genreOf, isColor, rememberGenreColor } from './bookStyle.js';

const KEY = 'lingo-reader:wordbook:v1';
const MKEY = 'lingo-reader:materials:v1';
const FKEY = 'lingo-reader:folders:v1';
const BKEY = 'lingo-reader:books:v1';
const FILEKEY = 'lingo-reader:files:v1';
export const KEYS = { words: KEY, materials: MKEY, folders: FKEY, books: BKEY, files: FILEKEY };

export function loadWordbook() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    // 旧バージョンで保存した単語にも復習の初期状態を補う
    return Array.isArray(list) ? list.map(migrate) : [];
  } catch {
    return [];
  }
}

// 旧版の「手動で追加」フォルダーは廃止：その単語は未分類に戻す
function migrate(w) {
  const n = { favorite: false, ...normalizeWord(w) };
  if (n.sourceKey === 'manual') {
    delete n.sourceKey;
    delete n.sourceTitle;
  }
  return n;
}

function persist(list, key = KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* 保存できない環境（プライベートモード等）では黙って無視 */
  }
}

const dedupeKey = (w) => `${w.lang}:${String(w.lemma).toLowerCase()}`;

// items: [{ lang, text, lemma, pos, meaning, conj, context }]
// 返り値: { added, skipped, list }
export function addToWordbook(items) {
  const list = loadWordbook();
  const seen = new Set(list.map(dedupeKey));
  let added = 0;
  let skipped = 0;
  for (const it of items) {
    const k = dedupeKey(it);
    if (seen.has(k)) {
      // 保存済みの単語でも、出典が未設定ならこの文章を出典にする
      const cur = list.find((w) => dedupeKey(w) === k);
      if (cur && !cur.sourceKey && !cur.folderId && it.sourceKey) {
        cur.sourceKey = it.sourceKey;
        cur.sourceTitle = it.sourceTitle;
      }
      skipped++;
      continue;
    }
    seen.add(k);
    const savedAt = Date.now();
    list.unshift({
      id: `${savedAt}-${Math.random().toString(36).slice(2, 7)}`,
      savedAt,
      ...newSrs(savedAt), // 保存した時点が「初回学習（step 0）」。最初の復習は20分後
      favorite: false,
      ...it,
    });
    added++;
  }
  persist(list);
  if (added > 0) recordStudy();
  return { added, skipped, list };
}

// 復習の結果（わかる/忘れた）を反映して保存。返り値は更新後の全リスト
export function reviewWord(id, remembered, now = Date.now()) {
  const list = loadWordbook().map((w) => (w.id === id ? applyPractice(w, remembered, now) : w));
  persist(list);
  recordStudy();
  return list;
}

const dupKey = (w) => `${w.lang}:${String(w.lemma).trim().toLowerCase()}`;

// 手動で単語を追加。返り値: { ok, error?, list }
export function addManualWord({ lang, lemma, meaning, context }, extra) {
  const list = loadWordbook();
  const word = String(lemma).trim();
  if (list.some((w) => dupKey(w) === dupKey({ lang, lemma: word }))) {
    return { ok: false, error: 'この言語では、同じ単語がすでに登録されています', list };
  }
  const savedAt = Date.now();
  list.unshift({
    id: `${savedAt}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt,
    ...newSrs(savedAt),
    favorite: false,
    lang,
    text: word,
    lemma: word,
    pos: '',
    meaning: String(meaning).trim(),
    conj: '',
    context: String(context ?? '').trim(),
    manual: true,
    ...(extra ?? {}),
  });
  persist(list);
  return { ok: true, list };
}

// 単語の内容を編集（lang / lemma / meaning / context）。復習の進み具合はそのまま
export function updateWord(id, patch) {
  const list = loadWordbook();
  const cur = list.find((w) => w.id === id);
  if (!cur) return { ok: false, error: '単語が見つかりません', list };
  const next = { ...cur, ...patch, lemma: String(patch.lemma ?? cur.lemma).trim() };
  if (list.some((w) => w.id !== id && dupKey(w) === dupKey(next))) {
    return { ok: false, error: 'この言語では、同じ単語がすでに登録されています', list };
  }
  const out = list.map((w) => (w.id === id ? next : w));
  persist(out);
  return { ok: true, list: out };
}

export function toggleFavorite(id) {
  const list = loadWordbook().map((w) => (w.id === id ? { ...w, favorite: !w.favorite } : w));
  persist(list);
  return list;
}

export function removeFromWordbook(id) {
  const list = loadWordbook().filter((w) => w.id !== id);
  persist(list);
  return list;
}

// ===== マイ教材（保存した文章）=====
export function loadMaterials() {
  try {
    const raw = localStorage.getItem(MKEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// m: { id?, title, text, lang, source, level?, genre? }
// id があり既存なら題名だけ更新、なければ新規保存。返り値: { record, list }
export function upsertMaterial(m) {
  const list = loadMaterials();
  const i = m.id ? list.findIndex((x) => x.id === m.id) : -1;
  let record;
  if (i >= 0) {
    record = { ...list[i], title: m.title };
    list[i] = record;
  } else {
    record = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      savedAt: Date.now(),
      title: m.title,
      text: m.text,
      lang: m.lang,
      source: m.source ?? 'paste',
      level: m.level ?? null,
      genre: m.genre ?? null,
      kind: m.kind ?? 'other', // 'other' | 'book' | 'article' | 'lyrics'
      ...(m.topic ? { topic: m.topic } : {}),
      ...(m.artist ? { artist: m.artist } : {}),
      ...(m.bookId ? { bookId: m.bookId, page: m.page } : {}),
      ...(m.fileId ? { fileId: m.fileId } : {}),
    };
    list.unshift(record);
    recordStudy();
  }
  persist(list, MKEY);
  return { record, list };
}

export function removeMaterial(id) {
  const list = loadMaterials().filter((m) => m.id !== id);
  persist(list, MKEY);
  // 本のページだった場合は、本の登録済みページからも外す（ページ番号は登録し直せる）
  const books = loadBooks();
  let changed = false;
  const next = books.map((b) => {
    const hit = Object.entries(b.pages ?? {}).find(([, mid]) => mid === id);
    if (!hit) return b;
    changed = true;
    const pages = { ...b.pages };
    delete pages[hit[0]];
    const nb = { ...b, pages };
    if (String(b.lastPage) === hit[0]) delete nb.lastPage;
    return nb;
  });
  if (changed) persist(next, BKEY);
  return list;
}

// ===== 本（ライブラリ）=====
// book: { id, title, lang, startPage, endPage, totalPages(=範囲のページ数), dailyGoal, createdAt, lastReadAt,
//          pages: { [ページ番号]: 教材id }, readLog: { 'YYYY-MM-DD': 件数 } }
export function loadBooks() {
  try {
    const raw = localStorage.getItem(BKEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(normBook) : [];
  } catch {
    return [];
  }
}

// 旧版の本（開始・終了ページが無い）は 1〜総ページ数 として扱う
function normBook(b) {
  if (typeof b.startPage === 'number' && typeof b.endPage === 'number') return b;
  const total = b.totalPages ?? 1;
  return { ...b, startPage: 1, endPage: total, totalPages: total };
}

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// 進捗: done = 読んだ（登録した）ページ数、current = いちばん先のページ番号
export function bookProgress(book) {
  const nums = Object.keys(book.pages ?? {}).map(Number);
  const done = nums.length;
  const current = nums.length ? Math.max(...nums) : 0;
  const total = book.totalPages ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { done, current, total, pct, finished: total > 0 && done >= total };
}

// この本から保存した単語の数（保存した時点でステップ1に入るので、保存済みの単語すべて）
export function bookWordCount(book, words = loadWordbook()) {
  return words.filter((w) => w.sourceKey === book.id).length;
}

// 次に登録するページ番号：直前に登録したページ + 1（挿絵などで番号を飛ばした場合も、その続きから）。
// まだ登録が無ければ開始ページ。登録済みの番号はさらに先へ送る。
export function nextPageNumber(book) {
  const nums = Object.keys(book.pages ?? {}).map(Number);
  const have = new Set(nums);
  const last = book.lastPage ?? (nums.length ? Math.max(...nums) : null);
  let n = last == null ? book.startPage : last + 1;
  n = Math.max(book.startPage, Math.min(n, book.endPage));
  while (have.has(n) && n < book.endPage) n++;
  return n;
}

export function todayPages(book, now = Date.now()) {
  return book.readLog?.[dayKey(now)] ?? 0;
}

const posInt = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : 0;
};

// 返り値: { ok, error?, book?, list }
export function createBook({ title, lang, startPage, endPage, dailyGoal, genre, color }) {
  const list = loadBooks();
  const t = String(title ?? '').trim();
  const start = posInt(startPage);
  const end = posInt(endPage);
  const goal = posInt(dailyGoal);
  if (!t) return { ok: false, error: '本の題名を入力してください', list };
  if (!start) return { ok: false, error: '開始ページは1以上の数字で入力してください', list };
  if (!end) return { ok: false, error: '終了ページは1以上の数字で入力してください', list };
  if (end < start) return { ok: false, error: '終了ページは開始ページ以降にしてください', list };
  if (end - start + 1 > 5000) return { ok: false, error: '読書範囲は5000ページまでです', list };
  if (!goal) return { ok: false, error: '1日の目標ページ数は1以上の数字で入力してください', list };
  const total = end - start + 1;
  const now = Date.now();
  const book = {
    id: `b-${now}-${Math.random().toString(36).slice(2, 6)}`,
    title: t,
    lang,
    startPage: start,
    endPage: end,
    totalPages: total,
    dailyGoal: Math.min(goal, total),
    genre: genreOf(genre) ? genre : undefined, // ジャンル（任意）
    color: isColor(color) ? color : undefined, // 自分で選んだ表紙の色（なければジャンル色）
    createdAt: now,
    lastReadAt: now,
    pages: {},
    readLog: {},
  };
  const next = [...list, book];
  persist(next, BKEY);
  if (book.genre && book.color) rememberGenreColor(book.genre, book.color); // 選んだ色を、そのジャンルの既定色にする
  return { ok: true, book, list: next };
}

export function removeBook(id, { withPages = true } = {}) {
  const list = loadBooks();
  const book = list.find((b) => b.id === id);
  const next = list.filter((b) => b.id !== id);
  persist(next, BKEY);
  if (book && withPages) {
    const ids = new Set(Object.values(book.pages ?? {}));
    persist(loadMaterials().filter((m) => !ids.has(m.id)), MKEY);
  }
  return next;
}

// 本の1ページ分の本文を登録（教材としても保存）。返り値: { ok, error?, book?, material?, created }
// すでに登録済みのページ番号なら、その教材をそのまま返す（created: false）
export function addBookPage(bookId, page, text) {
  const books = loadBooks();
  const book = books.find((b) => b.id === bookId);
  if (!book) return { ok: false, error: '本が見つかりません' };
  const n = posInt(page);
  if (!n || n < book.startPage || n > book.endPage) return { ok: false, error: `ページ番号は${book.startPage}〜${book.endPage}で入力してください` };
  const body = String(text ?? '').trim();
  const existing = book.pages?.[n] ? loadMaterials().find((m) => m.id === book.pages[n]) : null;
  if (existing) return { ok: true, book, material: existing, created: false };
  if (!body) return { ok: false, error: 'このページの本文を貼り付けてください' };
  const { record } = upsertMaterial({
    title: `${book.title} p.${n}`,
    text: body,
    lang: book.lang,
    source: 'paste',
    kind: 'book',
    bookId: book.id,
    page: n,
  });
  const now = Date.now();
  const key = dayKey(now);
  const updated = {
    ...book,
    lastReadAt: now,
    lastPage: n, // 直前に登録したページ（次の初期値 = これ + 1）
    pages: { ...book.pages, [n]: record.id },
    readLog: { ...book.readLog, [key]: (book.readLog?.[key] ?? 0) + 1 },
  };
  persist(books.map((b) => (b.id === book.id ? updated : b)), BKEY);
  recordStudy(now);
  return { ok: true, book: updated, material: record, created: true };
}

// ===== ファイル（ライブラリに並ぶフォルダー）=====
// file: { id, kind: 'article'|'lyrics'|'exam'|'ai'|'other', name, createdAt }
// 記事＝トピックごと、歌詞＝アーティストごと、長文問題・その他＝ユーザーが選ぶ／作るファイル
export function loadFiles() {
  try {
    const raw = localStorage.getItem(FILEKEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const sameFile = (f, kind, name) => f.kind === kind && f.name.trim().toLowerCase() === String(name).trim().toLowerCase();

// 同じ種類・同じ名前（大文字小文字は区別しない）のファイルがあればそれを、なければ作って返す
export function ensureFile(kind, name) {
  const list = loadFiles();
  const n = String(name).trim();
  const hit = list.find((f) => sameFile(f, kind, n));
  if (hit) return { file: hit, list, created: false };
  const file = { id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, name: n, createdAt: Date.now() };
  const next = [...list, file];
  persist(next, FILEKEY);
  return { file, list: next, created: true };
}

export function renameFile(id, name) {
  const n = String(name ?? '').trim();
  const list = loadFiles();
  const cur = list.find((f) => f.id === id);
  if (!cur) return { ok: false, error: 'ファイルが見つかりません', list };
  if (!n) return { ok: false, error: 'ファイル名を入力してください', list };
  if (n.length > 40) return { ok: false, error: 'ファイル名は40文字以内にしてください', list };
  if (list.some((f) => f.id !== id && sameFile(f, cur.kind, n))) return { ok: false, error: '同じ名前のファイルがすでにあります', list };
  const next = list.map((f) => (f.id === id ? { ...f, name: n } : f));
  persist(next, FILEKEY);
  return { ok: true, list: next };
}

// ファイルとその中の文章を削除（保存した単語は残る）
export function removeFile(id) {
  const next = loadFiles().filter((f) => f.id !== id);
  persist(next, FILEKEY);
  persist(loadMaterials().filter((m) => m.fileId !== id), MKEY);
  return next;
}

// 古いデータをファイル構造に移行：本以外のすべての文章を、いずれかのファイルに入れる。
// 変更があった場合だけ保存する。
export function migrateLibrary() {
  const mats = loadMaterials();
  let changed = false;
  const out = mats.map((m) => {
    if (m.kind === 'book' || m.fileId) return m;
    let kind = 'other';
    let name = 'その他の文章';
    if (m.kind === 'article') { kind = 'article'; name = m.topic || 'その他'; }
    else if (m.kind === 'lyrics') { kind = 'lyrics'; name = m.artist || 'アーティスト不明'; }
    else if (m.kind === 'exam') { kind = 'exam'; name = '長文問題'; }
    else if (m.source === 'ai') { kind = 'ai'; name = 'AI物語'; }
    const { file } = ensureFile(kind, name);
    changed = true;
    return { ...m, kind: m.kind ?? 'other', fileId: file.id };
  });
  if (changed) persist(out, MKEY);
  return changed;
}

// 出典の無い単語を、例文が含まれるマイ教材に結びつけて保存（変更があれば保存）。返り値: 最新の単語リスト
export function healWordbookSources() {
  const list = loadWordbook();
  let legacy = false;
  try {
    legacy = (localStorage.getItem(KEY) ?? '').includes('"sourceKey":"manual"');
  } catch {
    /* ignore */
  }
  const healed = healSources(list, loadMaterials());
  if (!healed && legacy) {
    persist(list);
    return list;
  }
  if (healed) {
    persist(healed);
    return healed;
  }
  return list;
}

// ===== カスタムフォルダー =====
export function loadFolders() {
  try {
    const raw = localStorage.getItem(FKEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function checkName(list, name, exceptId) {
  const n = String(name ?? '').trim();
  if (!n) return 'フォルダー名を入力してください';
  if (n.length > 30) return 'フォルダー名は30文字以内にしてください';
  if (list.some((f) => f.id !== exceptId && sameName(f.name, n))) return '同じ名前のフォルダーがすでにあります';
  return '';
}

// 返り値: { ok, error?, folder?, list }
export function createFolder(name) {
  const list = loadFolders();
  const error = checkName(list, name);
  if (error) return { ok: false, error, list };
  const folder = { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: String(name).trim(), createdAt: Date.now() };
  const next = [...list, folder];
  persist(next, FKEY);
  return { ok: true, folder, list: next };
}

export function renameFolder(id, name) {
  const list = loadFolders();
  const error = checkName(list, name, id);
  if (error) return { ok: false, error, list };
  const next = list.map((f) => (f.id === id ? { ...f, name: String(name).trim() } : f));
  persist(next, FKEY);
  return { ok: true, list: next };
}

// フォルダーだけを削除。中の単語は消さず、元の文章フォルダー（なければ未分類）に戻す
export function deleteFolder(id) {
  const folders = loadFolders().filter((f) => f.id !== id);
  persist(folders, FKEY);
  const words = loadWordbook().map((w) => {
    if (w.folderId !== id) return w;
    const { folderId, ...rest } = w; // eslint-disable-line no-unused-vars
    return rest;
  });
  persist(words);
  return { folders, words };
}

// 本の初期設定を変更（題名・開始/終了ページ・1日の目標・言語）。返り値: { ok, error?, book?, list }
export function updateBook(id, { title, lang, startPage, endPage, dailyGoal, genre, color }) {
  const list = loadBooks();
  const cur = list.find((b) => b.id === id);
  if (!cur) return { ok: false, error: '本が見つかりません', list };
  const t = String(title ?? '').trim();
  const start = posInt(startPage);
  const end = posInt(endPage);
  const goal = posInt(dailyGoal);
  if (!t) return { ok: false, error: '本の題名を入力してください', list };
  if (!start) return { ok: false, error: '開始ページは1以上の数字で入力してください', list };
  if (!end) return { ok: false, error: '終了ページは1以上の数字で入力してください', list };
  if (end < start) return { ok: false, error: '終了ページは開始ページ以降にしてください', list };
  if (end - start + 1 > 5000) return { ok: false, error: '読書範囲は5000ページまでです', list };
  if (!goal) return { ok: false, error: '1日の目標ページ数は1以上の数字で入力してください', list };
  const out = Object.keys(cur.pages ?? {}).map(Number).filter((n) => n < start || n > end);
  if (out.length) {
    return { ok: false, error: `登録済みの${out.sort((a, b) => a - b)[0]}ページが範囲外になります。範囲を広げるか、そのページを先に削除してください`, list };
  }
  const total = end - start + 1;
  const updated = { ...cur, title: t, lang, startPage: start, endPage: end, totalPages: total, dailyGoal: Math.min(goal, total) };
  // ジャンルと色は、渡されたときだけ変更（空なら「指定しない／自動」に戻す）
  if (genre !== undefined) { if (genreOf(genre)) updated.genre = genre; else delete updated.genre; }
  if (color !== undefined) { if (isColor(color)) updated.color = color; else delete updated.color; }
  if (updated.lastPage != null && (updated.lastPage < start || updated.lastPage > end)) delete updated.lastPage;
  const next = list.map((b) => (b.id === id ? updated : b));
  persist(next, BKEY);
  if (updated.genre && color && updated.color) rememberGenreColor(updated.genre, updated.color);
  // ページ教材の題名（「題名 p.N」）と言語を合わせる
  const mats = loadMaterials().map((m) => {
    if (m.bookId !== id) return m;
    const auto = m.title === `${cur.title} p.${m.page}`;
    return { ...m, lang, title: auto ? `${t} p.${m.page}` : m.title };
  });
  persist(mats, MKEY);
  return { ok: true, book: updated, list: next };
}

// 登録済みの文章（ページ）の題名・本文を編集。保存済みの単語が文章ごとのフォルダーから外れないよう、出典キーも付け替える
export function updateMaterial(id, { title, text }) {
  const list = loadMaterials();
  const cur = list.find((m) => m.id === id);
  if (!cur) return { ok: false, error: '文章が見つかりません', list };
  const body = String(text ?? cur.text).trim();
  const t = String(title ?? cur.title).trim();
  if (!body) return { ok: false, error: '本文を入力してください', list };
  if (!t) return { ok: false, error: '題名を入力してください', list };
  const next = list.map((m) => (m.id === id ? { ...m, title: t, text: body } : m));
  persist(next, MKEY);
  const oldKey = textKey(cur.text);
  const newKey = textKey(body);
  if (oldKey !== newKey || t !== cur.title) {
    const words = loadWordbook().map((w) =>
      w.sourceKey === oldKey ? { ...w, sourceKey: newKey, sourceTitle: t } : w,
    );
    persist(words);
  }
  return { ok: true, list: next };
}

// 文章を開いて学習した日時を記録（ファイルの一覧に「最後に学習した日」として出る）
export function touchMaterial(id, now = Date.now()) {
  const list = loadMaterials();
  if (!list.some((m) => m.id === id)) return;
  persist(list.map((m) => (m.id === id ? { ...m, lastStudiedAt: now } : m)), MKEY);
}

// 読破した本が本棚へ移った印（ライブラリで山積みから本棚へ飛んでいった時に付ける）
export function markShelved(id, now = Date.now()) {
  const list = loadBooks();
  if (!list.some((b) => b.id === id)) return;
  persist(list.map((b) => (b.id === id ? { ...b, shelvedAt: now } : b)), BKEY);
}
