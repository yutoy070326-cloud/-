import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadBooks, loadFiles, loadMaterials, loadWordbook, bookProgress, bookWordCount, todayPages, updateBook, removeBook, updateFile, removeFile, markShelved } from '../lib/storage.js';
import { loadShelf, setOrder, setSortMode, placeBlock, storeBlock, UNSTABLE_SHAPES } from '../lib/shelf.js';
import ItemMenu from '../components/ItemMenu.jsx';
import KindPicker from '../components/KindPicker.jsx';
import BookEditSheet from '../components/BookEditSheet.jsx';
import FileEditSheet from '../components/FileEditSheet.jsx';
import ToyBlock from '../components/ToyBlock.jsx';
import { langName } from '../lib/storyAI.js';
import { bookColor } from '../lib/bookStyle.js';
import { t } from '../lib/i18n.js';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';
import SeesawGroup from '../components/SeesawGroup.jsx';
import { toyDims } from '../components/ToyBlock.jsx';
import { useBackHandler } from '../lib/backRegistry.js';

const KIND_ICON = { article: '📰', lyrics: '🎵', exam: '📝', ai: '✨', other: '📁' };
const KIND_TAB = { article: '記事', lyrics: '歌詞', exam: '長文問題', ai: 'AI物語', other: 'その他' };
const KIND_ORDER = ['article', 'lyrics', 'exam', 'ai', 'other'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// 本：ページ数が多いほど分厚く（高さ）・大きく（幅）。ページ数は 1〜数百を想定
const bookSize = (pages) => ({
  h: Math.round(clamp(30 + Math.sqrt(pages) * 3.2, 30, 88)),
  w: Math.round(clamp(68 + Math.sqrt(pages) * 2, 68, 100)),
});
// ファイル：中の文章の量（文字数）が多いほど分厚く・少し大きく
const fileSize = (chars) => ({
  h: Math.round(clamp(30 + Math.sqrt(chars) * 0.7, 30, 88)),
  w: Math.round(clamp(72 + Math.sqrt(chars) * 0.3, 72, 100)),
});
// 本棚に立てた本：ページ数で背の高さと厚みが変わる
const spineSize = (pages) => ({
  h: Math.round(clamp(92 + Math.sqrt(pages) * 3, 92, 140)),
  w: Math.round(clamp(26 + Math.sqrt(pages) * 1.6, 26, 48)),
});

const GAP = 2; // 山のブロック同士のすきま（px）
const BLOCK_H = 34; // 積み木の台の高さ（基準。実際は大きさの倍率をかける）
// 積み木の大きさ（倍率）。古い積み木（倍率なし）は、id から決めた大小にする
const blockScale = (b) => {
  if (typeof b.scale === 'number') return b.scale;
  let h = 7;
  for (const c of String(b.id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return 0.7 + (Math.abs(h) % 90) / 100;
};
// 揺れ方（形ごとに、振れ幅と周期が違う）
const SEESAW = { triangle: [4.5, 2.6], circle: [5.5, 2.2], star: [3, 3.2], semicircle: [2.6, 3.6], arch: [2.6, 3.4] };
const PER_ROW = 7; // 本棚の1段に並べる本の数

// ---- 並び順（自動）----
const SORTS = [
  { id: 'manual', label: '手動（ドラッグで入れ替え）' },
  { id: 'new', label: '登録が新しい順' },
  { id: 'old', label: '登録が古い順' },
  { id: 'many', label: 'ページ数・文章数が多い順' },
  { id: 'few', label: 'ページ数・文章数が少ない順' },
  { id: 'alpha', label: 'アルファベット順（言語ごとの順）' },
  { id: 'progress', label: '達成度順（本：少ない→100%に近い）' },
];
// 言語ごとにまとめて、その言語の並べ方で比べる（日本語は50音、中国語は拼音の順 など）
const LANG_ORDER = ['en', 'es', 'fr', 'de', 'id', 'tl', 'ja', 'zh', 'ko', 'th', 'ru', 'ar'];
const COLLATE_TAG = { zh: 'zh-u-co-pinyin', ja: 'ja', ko: 'ko', ru: 'ru', ar: 'ar', id: 'id', tl: 'fil', th: 'th', es: 'es', fr: 'fr', de: 'de', en: 'en' };
const collators = {};
const collator = (lang) => (collators[lang] ??= new Intl.Collator(COLLATE_TAG[lang] ?? lang ?? 'en', { sensitivity: 'base', numeric: true }));
const langRank = (l) => { const i = LANG_ORDER.indexOf(l); return i < 0 ? 99 : i; };

function comparator(mode, pile) {
  const metric = (it) => (pile === 'books' ? it.book.totalPages ?? 0 : it.count ?? 0);
  switch (mode) {
    case 'new': return (a, b) => b.at - a.at;
    case 'old': return (a, b) => a.at - b.at;
    case 'many': return (a, b) => metric(b) - metric(a);
    case 'few': return (a, b) => metric(a) - metric(b);
    case 'alpha': return (a, b) => langRank(a.lang) - langRank(b.lang) || collator(a.lang).compare(a.name, b.name);
    case 'progress': return pile === 'books' ? (a, b) => a.p.pct - b.p.pct : (a, b) => b.at - a.at;
    default: return () => 0;
  }
}

// 保存済みの並びに、新しいもの（上に積む）と消えたものを反映する
function mergeOrder(saved, items) {
  const have = new Set(items.map((i) => i.id));
  const kept = saved.filter((id) => have.has(id));
  const fresh = items.filter((i) => !kept.includes(i.id)).sort((a, b) => b.at - a.at).map((i) => i.id);
  return [...fresh, ...kept];
}

// 本棚（ライブラリ）：本の山とファイルの山を、それぞれ積み上げる。開くたび・タブや並び順を切り替えるたびに、上から落ちて積み重なる。
// ブロックはドラッグで上下に入れ替えできる。読破した本は、開いたときに山から下の本棚へ飛んでいって、⭐のスタンプが押される。
const LONG_PRESS_MS = 500;
const MOVE_TOL = 10;
const DRAG_START = 8;

export default function Library({ onBack, onOpenBook, onOpenFile, onAdd, onChanged }) {
  const tut = useScreenTutorial('library');
  useBackHandler(onBack);
  const [picker, setPicker] = useState(false);
  const [rev, setRev] = useState(0);
  const [tab, setTab] = useState('all'); // 'all' | 'book' | ファイルの種類
  const [drop, setDrop] = useState(0); // タブ・並び順を切り替えるたびに増やして、積み上げの演出をやり直す
  const [menu, setMenu] = useState(null); // { type: 'book'|'file'|'block', id }
  const [mode, setMode] = useState(null); // 'edit' | null
  const [fileError, setFileError] = useState('');
  const [tray, setTray] = useState(false); // 積み木の持ち物（おもちゃ箱）
  const [selBlock, setSelBlock] = useState(null); // おもちゃ箱で選んだ積み木
  const [stamped, setStamped] = useState(() => new Set()); // ⭐スタンプを押している本
  const [drag, setDrag] = useState(null); // { id, pile, dy }
  const press = useRef({ t: null, fired: false, x: 0, y: 0, dragging: false, down: false, type: '', startY: 0, id: null, pile: null });
  const nodes = useRef({}); // 山のブロックの DOM
  const shelfNodes = useRef({}); // 本棚の本の DOM
  const ordRef = useRef({ books: [], files: [] }); // いまの並び（ドラッグ中に更新する）
  const flown = useRef(false);
  const [settled, setSettled] = useState(false); // 落ちて積み上がる演出が終わったか（終わったあとに作り直された段は、もう一度落とさない）

  const changed = () => {
    setRev((r) => r + 1);
    onChanged?.();
  };
  const closeAll = () => { setMenu(null); setMode(null); setFileError(''); };

  const data = useMemo(() => {
    const books = loadBooks();
    const files = loadFiles();
    const mats = loadMaterials();
    const words = loadWordbook();
    const shelf = loadShelf();
    const bookItems = books.map((b) => ({ type: 'book', id: b.id, at: b.createdAt ?? 0, book: b, p: bookProgress(b), name: b.title, lang: b.lang }));
    const fileItems = files.map((f) => {
      const ms = mats.filter((m) => m.fileId === f.id);
      return { type: 'file', id: f.id, at: f.createdAt ?? 0, file: f, count: ms.length, chars: ms.reduce((n, m) => n + (m.text?.length ?? 0), 0), name: f.name, lang: ms[0]?.lang ?? 'en' };
    });
    const blockItems = shelf.blocks.map((b) => ({ type: 'block', id: b.id, at: b.at ?? 0, block: b }));
    const shelvedBooks = bookItems.filter((i) => i.p.finished && i.book.shelvedAt).sort((a, b) => a.book.shelvedAt - b.book.shelvedAt);
    const leaving = bookItems.filter((i) => i.p.finished && !i.book.shelvedAt); // 読破したけど、まだ山にいる本
    const pileBooks = [...bookItems.filter((i) => !(i.p.finished && i.book.shelvedAt)), ...blockItems.filter((i) => i.block.pile === 'books')];
    const pileFiles = [...fileItems, ...blockItems.filter((i) => i.block.pile === 'files')];
    const byId = Object.fromEntries([...pileBooks, ...pileFiles].map((i) => [i.id, i]));
    const order = { books: mergeOrder(shelf.order.books, pileBooks), files: mergeOrder(shelf.order.files, pileFiles) };
    let pages = 0, finished = 0;
    for (const b of books) {
      const p = bookProgress(b);
      pages += p.done;
      if (p.finished) finished += 1;
    }
    return { books, files, words, shelf, bookItems, fileItems, blockItems, shelvedBooks, leaving, order, byId, stats: { pages, finished } };
  }, [rev]);
  ordRef.current = drag ? ordRef.current : data.order; // ドラッグ中以外は、保存された並びをそのまま使う
  const order = ordRef.current;

  // ---- タブ ----
  const tabs = [
    { id: 'all', label: t('lib.tab.all', 'すべて'), n: data.books.length + data.files.length },
    ...(data.books.length ? [{ id: 'book', label: t('lib.tab.book', '本'), n: data.books.length }] : []),
    ...KIND_ORDER.filter((k) => data.fileItems.some((i) => i.file.kind === k)).map((k) => ({ id: k, label: t(`lib.kind.${k}`, KIND_TAB[k]), n: data.fileItems.filter((i) => i.file.kind === k).length })),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : 'all';
  const showBooks = active === 'all' || active === 'book';
  const showFiles = active !== 'book';
  const filteredFiles = active === 'all' ? null : active; // 種類で絞り込み中は、並べ替えできない
  const canDrag = (pile) => (pile === 'books' ? showBooks : pile === 'files' ? showFiles && !filteredFiles : false);
  const pickTab = (id) => { setTab(id); setDrop((d) => d + 1); };
  useEffect(() => {
    setSettled(false);
    const id = window.setTimeout(() => setSettled(true), 2800);
    return () => window.clearTimeout(id);
  }, [drop, active]);

  const listFor = (pile) => order[pile].map((id) => data.byId[id]).filter((it) => {
    if (!it) return false;
    if (pile === 'files' && filteredFiles) return it.type === 'file' && it.file.kind === filteredFiles; // 種類で絞り込み中
    return true;
  });

  // ---- 自動で並べ替え ----
  const [sortMode, setSortModeState] = useState(() => loadShelf().sort);
  const applySort = (mode) => {
    setSortModeState(mode);
    setSortMode(mode);
    if (mode !== 'manual') {
      for (const pile of ['books', 'files']) {
        const cur = data.order[pile];
        const items = cur.map((id) => data.byId[id]).filter((it) => it && it.type !== 'block');
        const sorted = [...items].sort(comparator(mode, pile)).map((i) => i.id);
        let k = 0; // 積み木は、いまの位置のまま動かさない
        setOrder(pile, cur.map((id) => (data.byId[id]?.type === 'block' ? id : sorted[k++])));
      }
    }
    setDrop((d) => d + 1);
    changed();
  };

  // ---- 長押し（メニュー）・ドラッグ（入れ替え）・タップ（開く）----
  // ドラッグ中はブロックが DOM 上で入れ替わり、ポインターの捕捉が外れるので、window で動きを受け取る
  const handlers = useRef({});
  handlers.current.move = (e) => {
    const p = press.current;
    if (!p.dragging) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { handlers.current.up(true); return; } // ボタンを離したのに、離した合図が来なかったとき
    const { id, pile } = p;
    let off = e.clientY - p.startY;
    const ids = ordRef.current[pile];
    const idx = ids.indexOf(id);
    const hOf = (otherId) => (nodes.current[otherId]?.offsetHeight ?? 40) + GAP;
    if (off > 0 && idx < ids.length - 1) {
      const h = hOf(ids[idx + 1]);
      if (off > h * 0.6) { // 下の隣を半分以上こえた → 入れ替え
        const next = [...ids]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        ordRef.current = { ...ordRef.current, [pile]: next };
        p.startY += h; off -= h;
      }
    } else if (off < 0 && idx > 0) {
      const h = hOf(ids[idx - 1]);
      if (-off > h * 0.6) { // 上の隣を半分以上こえた → 入れ替え
        const next = [...ids]; [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
        ordRef.current = { ...ordRef.current, [pile]: next };
        p.startY -= h; off += h;
      }
    }
    setDrag({ id, pile, dy: off });
  };
  handlers.current.up = (commit) => {
    const p = press.current;
    window.removeEventListener('pointermove', p.mv);
    window.removeEventListener('pointerup', p.up);
    window.removeEventListener('pointercancel', p.cancel);
    window.removeEventListener('blur', p.cancel);
    p.down = false;
    if (!p.dragging) return;
    p.dragging = false;
    if (commit) {
      setOrder(p.pile, ordRef.current[p.pile]); // 入れ替えた並びを保存
      setSortModeState('manual');
      setSortMode('manual');
      changed();
    }
    setDrag(null);
  };
  const startDrag = (e, id, pile) => {
    const p = press.current;
    window.clearTimeout(p.t);
    p.fired = true; p.dragging = true; p.down = true; p.startY = e.clientY; p.id = id; p.pile = pile;
    ordRef.current = { books: [...data.order.books], files: [...data.order.files] };
    p.mv = (ev) => handlers.current.move(ev);
    p.up = () => handlers.current.up(true);
    p.cancel = () => handlers.current.up(false);
    window.addEventListener('pointermove', p.mv);
    window.addEventListener('pointerup', p.up);
    window.addEventListener('pointercancel', p.cancel);
    window.addEventListener('blur', p.cancel);
    setDrag({ id, pile, dy: 0 });
  };
  useEffect(() => () => handlers.current.up(false), []);

  // ・マウス：左ボタンを押したまま上下に動かすとドラッグ。長押しメニューは使わず、右クリックで編集・削除。
  // ・タッチ／ペン：持ったまま上下に動かすとドラッグ。動かさずに長押しすると編集・削除。
  // ・ボタンを押していない間にカーソルが触れただけでは、何も起きない
  const bind = (type, id, pile, open) => ({
    onPointerDown: (e) => {
      const p = press.current;
      p.fired = false;
      p.down = e.pointerType !== 'mouse' || e.button === 0; // マウスは左ボタンだけ
      p.type = e.pointerType; p.x = e.clientX; p.y = e.clientY;
      window.clearTimeout(p.t);
      if (p.down && e.pointerType !== 'mouse') {
        p.t = window.setTimeout(() => {
          p.fired = true;
          navigator.vibrate?.(15);
          setMenu({ type, id });
        }, LONG_PRESS_MS);
      }
    },
    onPointerMove: (e) => {
      const p = press.current;
      if (!p.down || p.dragging) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { p.down = false; return; } // 押していない
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (canDrag(pile) && Math.abs(dy) > DRAG_START && Math.abs(dy) > Math.abs(dx)) startDrag(e, id, pile); // 持ったまま上下に動かした
      else if (Math.hypot(dx, dy) > MOVE_TOL) window.clearTimeout(p.t);
    },
    onPointerUp: () => { press.current.down = false; window.clearTimeout(press.current.t); },
    onPointerCancel: () => { press.current.down = false; window.clearTimeout(press.current.t); },
    onPointerLeave: () => { if (!press.current.dragging) { press.current.down = false; window.clearTimeout(press.current.t); } },
    onDragStart: (e) => e.preventDefault(),
    onContextMenu: (e) => {
      e.preventDefault();
      window.clearTimeout(press.current.t);
      press.current.fired = true;
      setMenu({ type, id });
    },
    onClick: () => {
      if (press.current.fired) {
        press.current.fired = false;
        return;
      }
      open?.();
    },
  });

  // ---- 読破した本が、山から本棚へ飛んでいく ----
  // 画面をタップすると、演出をスキップして、すぐに本棚に並ぶ
  const leavingKey = data.leaving.map((i) => i.id).join(',');
  const skipRef = useRef(false);
  const curFly = useRef(null);
  const skipFlight = () => { skipRef.current = true; curFly.current?.finish?.(); };
  useEffect(() => {
    if (!data.leaving.length) { skipRef.current = false; return undefined; }
    let cancelled = false;
    // スキップできる待ち時間
    const wait = async (ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end && !skipRef.current && !cancelled) await new Promise((r) => window.setTimeout(r, 50));
    };
    (async () => {
      await wait(flown.current ? 250 : 2200); // 山が積み上がり終わってから
      flown.current = true;
      for (const it of data.leaving) {
        if (cancelled) return;
        if (skipRef.current) { // スキップ：残りの本も、すぐに本棚へ
          data.leaving.forEach((x) => markShelved(x.id));
          changed();
          return;
        }
        const from = nodes.current[it.id];
        const to = shelfNodes.current[it.id];
        if (!from || !to) continue;
        to.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await wait(650);
        if (cancelled) return;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        from.style.zIndex = '30';
        const fly = from.animate(
          [
            { transform: 'translate(0,0) rotate(0deg) scale(1)' },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) rotate(200deg) scale(.7)`, offset: 0.5 },
            { transform: `translate(${dx}px, ${dy}px) rotate(360deg) scale(${Math.min(1, b.width / a.width)})`, opacity: 1 },
          ],
          { duration: 1100, easing: 'ease-in-out', fill: 'forwards' },
        );
        curFly.current = fly;
        await fly.finished.catch(() => {});
        if (cancelled) return;
        markShelved(it.id);
        if (!skipRef.current) setStamped((s2) => new Set(s2).add(it.id)); // ⭐スタンプを押す（スキップしたときは省く）
        changed();
        await wait(2400); // スタンプを押す演出は、ゆっくり
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leavingKey]);

  const menuBook = menu?.type === 'book' ? data.books.find((b) => b.id === menu.id) : null;
  const menuFile = menu?.type === 'file' ? data.files.find((f) => f.id === menu.id) : null;
  const menuBlock = menu?.type === 'block' ? data.shelf.blocks.find((b) => b.id === menu.id) : null;
  const heldBlocks = data.shelf.blocks.filter((b) => !b.pile);
  const empty = data.books.length + data.files.length === 0;

  const dragStyle = (id) => (drag?.id === id ? { transform: `translateY(${drag.dy}px) scale(1.04)`, zIndex: 40, boxShadow: '0 10px 22px rgba(0,0,0,.45)', transition: 'none' } : undefined);

  const renderItem = (it, pile, rank, below) => {
    const dragging = drag?.id === it.id;
    const common = { ref: (el) => { nodes.current[it.id] = el; } };
    const drg = canDrag(pile) ? ' draggable' : '';
    const seesaw = null;
    const sw = null;
    if (it.type === 'block') {
      const b = it.block;
      return (
        <button key={it.id} {...common} className={'stack-item toy-slot' + drg + (dragging ? ' dragging' : '') + (UNSTABLE_SHAPES.includes(b.shape) ? ' unstable' : '')} data-testid="toy-block"
          style={{ '--h': `${toyDims(b.shape, Math.round(BLOCK_H * blockScale(b))).h}px`, '--bw': `${toyDims(b.shape, Math.round(BLOCK_H * blockScale(b))).w + 6}px`, '--d': `${rank * 90 + 30}ms`, ...dragStyle(it.id) }}
          {...bind('block', b.id, pile, null)} aria-label="積み木（ドラッグで位置を変えられます）">
          <ToyBlock shape={b.shape} color={b.color} size={Math.round(BLOCK_H * blockScale(b))} />
        </button>
      );
    }
    if (it.type === 'book') {
      const b = it.book;
      const { h, w } = bookSize(b.totalPages ?? 1);
      return (
        <button key={it.id} {...common} className={'stack-item book' + drg + (dragging ? ' dragging' : '') + (seesaw ? ' seesaw' : '')} data-testid="book-cover"
          style={{ '--c': bookColor(b), '--h': `${h}px`, '--w': `${w}%`, '--p': `${it.p.pct}%`, '--d': `${rank * 90}ms`, ...sw, ...dragStyle(it.id) }}
          {...bind('book', b.id, pile, () => onOpenBook(b.id))}
          aria-label={`${b.title}（読んだページ ${it.p.done}/${b.totalPages}、覚えた単語 ${bookWordCount(b, data.words)}語）`}>
          <span className="stack-fill" aria-hidden="true" />
          <span className="stack-label">
            <span className="stack-title">{b.title}</span>
            {h >= 44 && <span className="stack-info">{it.p.done}/{b.totalPages}p ・ {it.p.pct}%</span>}
          </span>
        </button>
      );
    }
    const f = it.file;
    const { h, w } = fileSize(it.chars);
    return (
      <button key={it.id} {...common} className={`stack-item file k-${f.kind}` + drg + (dragging ? ' dragging' : '') + (seesaw ? ' seesaw' : '')} data-testid="file-folder"
        style={{ '--h': `${h}px`, '--w': `${w}%`, '--d': `${rank * 90 + 45}ms`, ...sw, ...dragStyle(it.id) }}
        {...bind('file', f.id, pile, () => onOpenFile(f.id))}
        aria-label={`ファイル ${f.name}（${it.count}件、${it.chars}字）`}>
        <span className="stack-label">
          <span className="stack-title">{KIND_ICON[f.kind] ?? '📁'} {f.name}</span>
          {h >= 44 && <span className="stack-info">{it.count}件 ・ {it.chars.toLocaleString()}字</span>}
        </span>
      </button>
    );
  };

  // 不安定な形の積み木（三角・丸・星・半円・アーチ）の上に乗っているもの「全部」を1つのかたまりにして、シーソーのように揺らす。
  // 乗っているものが多い・高いほど、振れ幅は大きく、ゆっくり揺れる。隣の山に被らないよう、かたまりの幅と振れ幅は自動で調整する。
  const renderPile = (pile) => {
    const items = listFor(pile);
    const total = items.length;
    const rankOf = (idx) => total - 1 - idx; // 下の段から順に落ちてくる
    const build = (arr, offset) => {
      let k = -1;
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i].type === 'block' && UNSTABLE_SHAPES.includes(arr[i].block.shape)) { k = i; break; }
      const flat = (list, off) => list.map((it, i) => renderItem(it, pile, rankOf(off + i), list[i + 1]));
      if (k <= 0) return flat(arr, offset);
      const above = arr.slice(0, k);
      const count = above.filter((x) => x.type !== 'block').length;
      if (count === 0) return flat(arr, offset);
      return [
        <SeesawGroup key={`sg-${arr[k].id}`} shape={arr[k].block.shape} count={count} paused={!!drag}>{build(above, offset)}</SeesawGroup>,
        ...flat(arr.slice(k), offset + k),
      ];
    };
    return build(items, 0);
  };
  const bookCount = listFor('books').filter((i) => i.type === 'book').length;
  const fileCount = listFor('files').filter((i) => i.type === 'file').length;

  // ---- 本棚（読破した本）----
  const shelfBooks = [...data.shelvedBooks, ...data.leaving];
  const shelfRows = [];
  for (let i = 0; i < shelfBooks.length; i += PER_ROW) shelfRows.push(shelfBooks.slice(i, i + PER_ROW));

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost back-btn" onClick={onBack} aria-label={t('common.back', '← 戻る')}>{t('common.back', '← 戻る')}</button>
        <h2 className="title">{t('home.library', 'ライブラリ')}</h2>
        <button className="btn ghost" onClick={tut.show} data-testid="show-tutorial-library" aria-label={t('common.help', '使い方')}>{t('common.help', '使い方')}</button>
      </header>
      <main className="content library-main" data-testid="library">
        <section className="lib-stats four" data-testid="lib-stats">
          <div className="stat"><b data-testid="stat-books">{data.books.length}</b><span>{t('lib.stat.books', '本')}</span></div>
          <div className="stat"><b data-testid="stat-files">{data.files.length}</b><span>{t('lib.stat.files', 'ファイル')}</span></div>
          <div className="stat"><b data-testid="stat-finished">{data.stats.finished}</b><span>{t('lib.stat.finished', '読み終えた本')}</span></div>
          <div className="stat"><b data-testid="stat-pages">{data.stats.pages}</b><span>{t('lib.stat.pages', '学んだページ')}</span></div>
        </section>

        {/* 種類のタブ（単語帳の言語タブと同じ） */}
        <nav className="tabs lib-tabs" role="tablist" aria-label={t('lib.kind', '種類')} data-testid="lib-tabs">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={active === t.id} className={'tab' + (active === t.id ? ' on' : '')} onClick={() => pickTab(t.id)} data-testid={`lib-tab-${t.id}`}>
              {t.label} <span className="tab-count">{t.n}</span>
            </button>
          ))}
        </nav>

        <div className="lib-tools">
          <label className="sort-label" htmlFor="lib-sort">{t('lib.sort', '並び順')}</label>
          <select id="lib-sort" className="input sort-select" value={sortMode} onChange={(e) => applySort(e.target.value)} data-testid="lib-sort">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{t(`lib.sort.${s.id}`, s.label)}</option>)}
          </select>
          <button className="toybox-btn" onClick={() => setTray(true)} data-testid="open-tray" aria-label={t('lib.tray.btn', '🧱 積み木 {n}', { n: heldBlocks.length })}><span className="toybox-btn-lid" aria-hidden="true" /><span className="toybox-btn-body">{t('lib.tray.btn', '🧱 積み木 {n}', { n: heldBlocks.length })}</span></button>
        </div>

        <div className={'stack' + (settled ? ' settled' : '')} data-testid="shelf" key={`${active}-${drop}`}>
          {empty && data.blockItems.length === 0 ? (
            <p className="shelf-empty">{t('lib.empty', 'まだ何もありません。右下の「＋」から、本や記事を追加しましょう。')}</p>
          ) : (
            <div className={'piles' + (showBooks && showFiles ? ' two' : '')}>
              {showBooks && (
                <div className="pile-col" data-testid="pile-books">
                  <div className="pile-cap">{t('lib.cap.books', '📚 本 {n}', { n: bookCount })}</div>
                  <div className="pile">
                    {bookCount === 0 && listFor('books').length === 0 && <p className="pile-empty">{t('lib.nobooks', '本はまだありません')}</p>}
                    {renderPile('books')}
                  </div>
                </div>
              )}
              {showFiles && (
                <div className="pile-col" data-testid="pile-files">
                  <div className="pile-cap">{t('lib.cap.files', '📁 ファイル {n}', { n: fileCount })}</div>
                  <div className="pile">
                    {fileCount === 0 && listFor('files').length === 0 && <p className="pile-empty">{t('lib.nofiles', 'ファイルはまだありません')}</p>}
                    {renderPile('files')}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="board" />
        </div>

        {!empty && <p className="hint center">{t('lib.hint', '持ったまま上下に動かすと、順番を入れ替えられます（長押し・右クリックで編集・削除）')}</p>}

        {showBooks && shelfBooks.length > 0 && (
          <section className="bookcase" data-testid="bookcase">
            <h3 className="section-title">{t('lib.case', '📚 本棚（読破した本）')}</h3>
            {shelfRows.map((row, ri) => (
              <div className="case-row" key={ri}>
                <div className="spines-row">
                  {row.map((it) => {
                    const b = it.book;
                    const { h, w } = spineSize(b.totalPages ?? 1);
                    const pending = !b.shelvedAt; // まだ山から飛んでくる途中（場所だけ空けておく）
                    return (
                      <button key={b.id} ref={(el) => { shelfNodes.current[b.id] = el; }}
                        className={'case-spine' + (pending ? ' pending' : '') + (stamped.has(b.id) ? ' stamping' : '')}
                        data-testid="shelf-book" style={{ '--c': bookColor(b), height: h, width: w }}
                        {...bind('book', b.id, 'case', () => onOpenBook(b.id))} aria-label={`${b.title}（読破）`}>
                        <span className="case-title">{b.title}</span>
                        {!pending && <span className="case-star" data-testid="case-star">⭐</span>}
                        {stamped.has(b.id) && <span className="stamp-fx" aria-hidden="true">⭐</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="board" />
              </div>
            ))}
          </section>
        )}

        {data.bookItems.some((i) => !i.p.finished) && (
          <>
            <h3 className="section-title">{t('lib.progress', '読書の進み具合')}</h3>
            <ul className="book-list">
              {data.bookItems.filter((i) => !i.p.finished).map(({ book: b, p }) => {
                const t = todayPages(b);
                return (
                  <li key={b.id}>
                    <button className="book-row" onClick={() => onOpenBook(b.id)} data-testid="book-row">
                      <span className="book-row-title">{b.title}</span>
                      <span className="book-row-sub">
                        <span className="word-lang">{langName(b.lang)}</span>
                        <span data-testid="row-progress">読んだ {p.done} / {b.totalPages} ページ</span>
                        <span data-testid="row-words">🧠 {bookWordCount(b, data.words)}語</span>
                        <span className={t >= b.dailyGoal ? 'goal-ok' : ''}>今日 {t}/{b.dailyGoal}</span>
                      </span>
                      <span className="bar"><span style={{ width: `${p.pct}%` }} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {data.leaving.length > 0 && showBooks && (
          <div className="fly-skip" onClick={skipFlight} data-testid="fly-skip" role="button" aria-label={t('lib.skipfly', 'タップでスキップ')}>
            <span className="fly-skip-hint">{t('lib.skipfly', 'タップでスキップ')}</span>
          </div>
        )}

        <div className="fab-wrap">
          <button className="fab" onClick={() => setPicker(true)} data-testid="add-fab" aria-label={t('lib.add', '追加する')}>＋</button>
        </div>
      </main>

      {picker && (
        <KindPicker
          onClose={() => setPicker(false)}
          onPick={(k) => {
            setPicker(false);
            onAdd(k);
          }}
        />
      )}

      {tray && (
        <div className="sheet-backdrop" onClick={() => setTray(false)}>
          <div className="sheet" role="dialog" aria-label={t('lib.block', '積み木')} onClick={(e) => e.stopPropagation()} data-testid="tray">
            <h3 className="sheet-title">{t('lib.tray.title', '🧱 積み木（{n}個）', { n: heldBlocks.length })}</h3>
            <p className="hint">{t('lib.tray.hint', '本の山・ファイルの山の「間」に置くと、ブックエンドや仕切りになります。置いたあとは、ドラッグで好きな位置に動かせます。')}</p>
            {heldBlocks.length === 0 && <p className="empty">{t('lib.tray.none', '持っている積み木はありません。')}</p>}
            <div className="tray-list">
              {heldBlocks.map((b) => (
                <div key={b.id} className="tray-item" data-testid="tray-item">
                  <ToyBlock shape={b.shape} color={b.color} size={Math.round(46 * blockScale(b))} />
                  <button className="btn small" onClick={() => { placeBlock(b.id, 'books', data.order.books); setDrop((d) => d + 1); changed(); }} data-testid="place-books">{t('lib.tray.tobooks', '本の山へ')}</button>
                  <button className="btn small" onClick={() => { placeBlock(b.id, 'files', data.order.files); setDrop((d) => d + 1); changed(); }} data-testid="place-files">{t('lib.tray.tofiles', 'ファイルの山へ')}</button>
                </div>
              ))}
            </div>
            <div className="sheet-actions"><button className="btn primary" onClick={() => setTray(false)}>{t('common.close', '閉じる')}</button></div>
          </div>
        </div>
      )}

      {menuBlock && (
        <div className="sheet-backdrop" onClick={closeAll}>
          <div className="sheet menu-sheet" role="dialog" aria-label="積み木のメニュー" onClick={(e) => e.stopPropagation()}>
            <h3 className="sheet-title menu-title">{t('lib.block', '積み木')}</h3>
            <div className="menu-actions">
              <button className="btn block" onClick={() => { storeBlock(menuBlock.id); closeAll(); setDrop((d) => d + 1); changed(); }} data-testid="block-store">{t('lib.tray.store', '📦 持ち物にしまう')}</button>
              <button className="btn ghost block" onClick={closeAll}>{t('common.cancel', 'キャンセル')}</button>
            </div>
          </div>
        </div>
      )}

      {menu && !mode && (menuBook || menuFile) && (
        <ItemMenu
          title={menuBook ? menuBook.title : menuFile.name}
          detail={menuBook
            ? `登録したページ（${Object.keys(menuBook.pages ?? {}).length}）も削除されます。保存した単語は残ります。`
            : '中の文章もすべて削除されます。保存した単語は残ります。'}
          onEdit={() => setMode('edit')}
          onDelete={() => {
            if (menuBook) removeBook(menuBook.id);
            else removeFile(menuFile.id);
            closeAll();
            changed();
          }}
          onClose={closeAll}
        />
      )}
      {menuBook && mode === 'edit' && (
        <BookEditSheet
          book={menuBook}
          onClose={closeAll}
          onSave={(f) => {
            const r = updateBook(menuBook.id, f);
            if (!r.ok) return r.error;
            closeAll();
            changed();
            return undefined;
          }}
        />
      )}
      {menuFile && mode === 'edit' && (
        <FileEditSheet
          file={menuFile}
          error={fileError}
          onClose={closeAll}
          onSave={(f) => {
            const r = updateFile(menuFile.id, f);
            if (!r.ok) { setFileError(r.error); return; }
            closeAll();
            changed();
          }}
        />
      )}
      {tut.node}
    </div>
  );
}
