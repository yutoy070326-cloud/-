// 多言語対応（i18n）。
// 使い方: t('home.finish', '学習を終える')  / t('notes.lines', '{n}件', { n: 3 })
//  - 第2引数は日本語の文言（ソースの文言そのもの。日本語表示のときはこれを使う）
//  - 日本語以外は src/locales/<言語>.js の辞書（key → 文言）を引く。無ければ日本語にフォールバックする
// 言語を足すには、src/locales に <code>.js を作って CATALOGS に登録し、UI_LANGS に加える。
import en from '../locales/en.js';
import { loadSettings, saveSettings } from './settings.js';

export const UI_LANGS = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];
const CATALOGS = { en };

const initial = () => {
  const saved = loadSettings().uiLang;
  if (saved && UI_LANGS.some((l) => l.code === saved)) return saved;
  return 'ja';
};
let current = initial();

export const getUiLang = () => current;
export function setUiLang(code) {
  if (!UI_LANGS.some((l) => l.code === code)) return;
  current = code;
  saveSettings({ uiLang: code });
  try { document.documentElement.lang = code; } catch { /* ignore */ }
}

const fill = (s, params) => (params ? s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m)) : s);

export function t(key, ja, params) {
  if (current === 'ja') return fill(ja, params);
  return fill(CATALOGS[current]?.[key] ?? ja, params);
}

// 日付などの表示に使うロケール
export const uiLocale = () => (current === 'ja' ? 'ja-JP' : current === 'en' ? 'en-US' : current);
