import { loadSettings, saveSettings } from './settings.js';

// 本の見た目：ジャンルと表紙（背表紙）の色。
// ジャンルを選ぶと色が自動で決まり、自分で色を選んだときだけ、その色を使う。
export const BOOK_GENRES = [
  { id: 'novel', label: '小説', color: '#b5483f' },
  { id: 'fantasy', label: 'ファンタジー', color: '#6d4fa8' },
  { id: 'children', label: '児童書・絵本', color: '#d99a1f' },
  { id: 'nonfiction', label: 'ノンフィクション', color: '#3f7d5b' },
  { id: 'study', label: '学習・教科書', color: '#2f5d8a' },
  { id: 'history', label: '歴史・社会', color: '#8a6a2f' },
  { id: 'science', label: '科学・技術', color: '#2f8a8a' },
  { id: 'poetry', label: '詩・エッセイ', color: '#c1668a' },
  { id: 'other', label: 'その他', color: '#6b7280' },
];

// 自分で選べる色
export const BOOK_COLORS = [
  '#b5483f', '#d9762b', '#d99a1f', '#8aa62b', '#3f7d5b', '#2f8a8a',
  '#2f5d8a', '#6d4fa8', '#c1668a', '#8a6a2f', '#6b7280', '#2b2b33',
];

const FALLBACK = ['#9b3d3d', '#2f5d8a', '#3d7a5a', '#8a6a2f', '#5b4a8a', '#2f7a7a', '#a1546b', '#555f6e'];
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export const genreOf = (id) => BOOK_GENRES.find((g) => g.id === id) ?? null;
export const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// ジャンルごとの「いまの既定色」（自分で変えた色があればそれ、なければ初期色）
export function genreColorMap() {
  const saved = loadSettings().genreColors ?? {};
  return Object.fromEntries(BOOK_GENRES.map((g) => [g.id, isColor(saved[g.id]) ? saved[g.id] : g.color]));
}

// ジャンルを選んで色も変えたときに呼ぶ：その色を、そのジャンルの既定色として覚える。
// 他のジャンルの既定色と被ったら、そちらを、どのジャンルとも被らない色に付け替える。
export function rememberGenreColor(genre, color) {
  if (!genreOf(genre) || !isColor(color)) return;
  const map = genreColorMap();
  map[genre] = color;
  for (const g of BOOK_GENRES) {
    if (g.id === genre || !same(map[g.id], color)) continue;
    const used = Object.values(map);
    const free = BOOK_COLORS.find((c) => !used.some((u) => same(u, c)));
    if (free) map[g.id] = free;
  }
  saveSettings({ genreColors: map });
}

// 自動の色（ジャンルがあればそのジャンルの既定色、なければ題名から決めた色）
export const autoBookColor = (book) => (book.genre && genreOf(book.genre) ? genreColorMap()[book.genre] : FALLBACK[hash(String(book.title ?? '')) % FALLBACK.length]);
// 実際に使う色（自分で選んだ色が最優先）
export const bookColor = (book) => (isColor(book.color) ? book.color : autoBookColor(book));
