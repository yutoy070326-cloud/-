// データのバックアップ（JSON）と復元。すべての学習データ（単語・復習の進捗・お気に入り・
// マイ教材・カスタムフォルダー）を1つのファイルにまとめる。

import { loadWordbook, loadMaterials, loadFolders, loadBooks, loadFiles, migrateLibrary, KEYS } from './storage.js';

export const BACKUP_APP = 'lingo-reader';
export const BACKUP_VERSION = 1;

export function buildBackup(now = new Date()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { words: loadWordbook(), materials: loadMaterials(), folders: loadFolders(), books: loadBooks(), files: loadFiles() },
  };
}

export function backupFileName(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `lingo-reader-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

// ファイルの中身（文字列）を検証。返り値: { ok:true, backup, counts } | { ok:false, error }
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSONファイルとして読み込めませんでした' };
  }
  if (!isObj(json) || json.app !== BACKUP_APP || !isObj(json.data)) {
    return { ok: false, error: 'Lingo Reader のバックアップファイルではありません' };
  }
  if (typeof json.version === 'number' && json.version > BACKUP_VERSION) {
    return { ok: false, error: 'より新しい版のバックアップです。アプリを更新してから読み込んでください' };
  }
  const d = json.data;
  const words = Array.isArray(d.words) ? d.words.filter((w) => isObj(w) && w.id && w.lemma) : null;
  const materials = Array.isArray(d.materials) ? d.materials.filter((m) => isObj(m) && m.id && typeof m.text === 'string') : null;
  const folders = Array.isArray(d.folders) ? d.folders.filter((f) => isObj(f) && f.id && f.name) : null;
  const files = Array.isArray(d.files) ? d.files.filter((f) => isObj(f) && f.id && f.name) : [];
  const books = Array.isArray(d.books) ? d.books.filter((b) => isObj(b) && b.id && b.title) : [];
  if (!words || !materials || !folders) {
    return { ok: false, error: 'バックアップの内容が壊れています' };
  }
  return {
    ok: true,
    backup: { ...json, data: { words, materials, folders, books, files } },
    counts: { words: words.length, materials: materials.length, folders: folders.length, books: books.length },
  };
}

// 検証済みのバックアップで、現在のデータを完全に置き換える
export function restoreBackup(backup) {
  const { words, materials, folders, books = [], files = [] } = backup.data;
  try {
    localStorage.setItem(KEYS.words, JSON.stringify(words));
    localStorage.setItem(KEYS.materials, JSON.stringify(materials));
    localStorage.setItem(KEYS.folders, JSON.stringify(folders));
    if (books.length) localStorage.setItem(KEYS.books, JSON.stringify(books));
    else localStorage.removeItem(KEYS.books);
    if (files.length) localStorage.setItem(KEYS.files, JSON.stringify(files));
    else localStorage.removeItem(KEYS.files);
  } catch {
    return { ok: false, error: '保存できませんでした（ブラウザの保存容量・設定を確認してください）' };
  }
  migrateLibrary(); // 古いバックアップの文章も、ファイルに振り分ける
  return { ok: true, counts: { words: words.length, materials: materials.length, folders: folders.length, books: books.length } };
}

// ブラウザに「消さないで」とお願いする（対応ブラウザのみ）
export function requestPersistentStorage() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}
