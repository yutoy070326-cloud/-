// 本棚まわりの記録：山の並び順・積み木（ログインボーナス）・スタンプカード。
// lingo-reader:shelf:v1（バックアップ対象）。
import { dayStr } from './studyLog.js';

export const SHELF_KEY = 'lingo-reader:shelf:v1';
export const STAMP_SLOTS = 10; // スタンプカード1枚のマス数

export const BLOCK_SHAPES = [
  { id: 'square', label: '四角' },
  { id: 'triangle', label: '三角' },
  { id: 'circle', label: '丸' },
  { id: 'trapezoid', label: '台形' },
  { id: 'star', label: '星' },
  { id: 'semicircle', label: '半円' },
  { id: 'hexagon', label: '六角形' },
  { id: 'arch', label: 'アーチ' },
];
export const BLOCK_COLORS = ['#ef5350', '#ffb300', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043', '#26c6da', '#ec407a'];

const EMPTY = { order: { books: [], files: [] }, blocks: [], stamps: [], sort: 'manual' };

export function loadShelf() {
  try {
    const s = JSON.parse(localStorage.getItem(SHELF_KEY));
    if (!s || typeof s !== 'object') return structuredClone(EMPTY);
    return {
      order: { books: Array.isArray(s.order?.books) ? s.order.books : [], files: Array.isArray(s.order?.files) ? s.order.files : [] },
      blocks: Array.isArray(s.blocks) ? s.blocks.filter((b) => b && b.id) : [],
      stamps: Array.isArray(s.stamps) ? s.stamps.filter((x) => x && x.day) : [],
      sort: typeof s.sort === 'string' ? s.sort : 'manual',
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveShelf(next) {
  try {
    localStorage.setItem(SHELF_KEY, JSON.stringify(next));
  } catch {
    /* 保存できなくても動作は続ける */
  }
  return next;
}
const update = (fn) => saveShelf(fn(loadShelf()));

// ---- 並び順 ----
export const setOrder = (pile, ids) => update((s) => ({ ...s, order: { ...s.order, [pile]: ids } }));
export const setSortMode = (sort) => update((s) => ({ ...s, sort }));

// ---- 積み木 ----
export function newBlock(now = Date.now(), rng = Math.random) {
  return {
    id: `blk-${now}-${Math.floor(rng() * 1e6)}`,
    shape: BLOCK_SHAPES[Math.floor(rng() * BLOCK_SHAPES.length)].id,
    color: BLOCK_COLORS[Math.floor(rng() * BLOCK_COLORS.length)],
    pile: null, // null＝持っているだけ（まだ山に置いていない）／'books'／'files'
    at: now,
  };
}
// 山の一番上に置く
// currentIds: いまの山の並び（上→下）。その先頭に積み木を足す
export const placeBlock = (id, pile, currentIds = []) => update((s) => ({
  ...s,
  blocks: s.blocks.map((b) => (b.id === id ? { ...b, pile } : b)),
  order: { ...s.order, [pile]: [id, ...currentIds.filter((x) => x !== id)] },
}));
// 山から外して、持ち物に戻す
export const storeBlock = (id) => update((s) => ({
  ...s,
  blocks: s.blocks.map((b) => (b.id === id ? { ...b, pile: null } : b)),
  order: { books: s.order.books.filter((x) => x !== id), files: s.order.files.filter((x) => x !== id) },
}));

// ---- ログインボーナス（スタンプカード）----
// ログインした日は毎日スタンプを1つ押す。積み木は、初回と毎週月曜日だけもらえる。
// 返り値: { stamp, block|null, index } | null（今日はもうスタンプを押した）
export function claimLoginBonus(now = Date.now(), rng = Math.random) {
  const s = loadShelf();
  const today = dayStr(now);
  if (s.stamps.some((x) => x.day === today)) return null;
  const first = s.stamps.length === 0;
  const giveBlock = first || new Date(now).getDay() === 1;
  const block = giveBlock ? newBlock(now, rng) : null;
  const stamp = { day: today, at: now, blockId: block ? block.id : null, first };
  saveShelf({ ...s, blocks: block ? [...s.blocks, block] : s.blocks, stamps: [...s.stamps, stamp] });
  return { stamp, block, index: s.stamps.length };
}
