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

// 自動の色（ジャンルがあればジャンル色、なければ題名から決めた色）
export const autoBookColor = (book) => genreOf(book.genre)?.color ?? FALLBACK[hash(String(book.title ?? '')) % FALLBACK.length];
// 実際に使う色（自分で選んだ色が最優先）
export const bookColor = (book) => (isColor(book.color) ? book.color : autoBookColor(book));
