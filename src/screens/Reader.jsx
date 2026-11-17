import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { tokenize, sentenceAround } from '../lib/tokenize.js';
import { findRange, lookupWord } from '../lib/dictionary.js';
import WordDetail from '../components/WordDetail.jsx';
import FormTags from '../components/FormTags.jsx';
import ConjTable from '../components/ConjTable.jsx';
import SpeakButton from '../components/SpeakButton.jsx';
import SpeedSwitch from '../components/SpeedSwitch.jsx';
import Reading from '../components/Reading.jsx';
import { loadAlwaysDetail, saveAlwaysDetail } from '../lib/detailPref.js';
import { loadSettings, highlightColor, posCategory } from '../lib/settings.js';
import { translateSentences, translateSelection } from '../lib/translate.js';
import { addToWordbook, upsertMaterial } from '../lib/storage.js';
import TitleSheet from '../components/TitleSheet.jsx';
import { textKey } from '../lib/folders.js';

const HEADER_H = 56 + 52; // ヘッダー + 上部の操作バー（固定）
const SELECTION_DEBOUNCE_MS = 400; // ハンドルをドラッグし終わるのを待つ時間
const LONG_PRESS_MS = 500; // これ以上押していたら「タップ」ではなく長押し
const MOVE_TOLERANCE = 14; // これ以上動いたら「タップ」ではなくドラッグ
const CARD_ROOM = 220; // 選択カードを置くのに必要な余白(px)
const DOUBLE_TAP_MS = 350; // この間隔・近い位置での2回目のタップ = ダブルタップ（選択の前触れ）
const DOUBLE_TAP_DIST = 24;
const UNDO_WINDOW_MS = 700; // 直前のタップ操作を取り消せる時間（選択操作が始まったと分かった時）
const SELECTION_GUARD_MS = 700; // 選択操作を検知してからタップ判定を無効にする時間

// 選択範囲の端（node, offset）が属するトークン番号を返す
function tokenFromBoundary(node, offset, article, isEnd) {
  if (!node) return null;
  let el = node.nodeType === 3 ? node.parentElement : node;
  let tokEl = el?.closest?.('[data-t]');
  if (!tokEl || !article.contains(tokEl)) {
    // 境界が段落ラッパーや本文そのものにあるとき（トリプルタップ等）は、中のトークンで判定
    if (node.nodeType === 3 || !article.contains(node)) return null;
    const kids = Array.from(node.childNodes);
    const k = Math.max(0, Math.min(isEnd ? offset - 1 : offset, kids.length - 1));
    const kid = kids[k];
    if (!kid || kid.nodeType !== 1) return null;
    const all = kid.matches('[data-t]') ? [kid] : Array.from(kid.querySelectorAll('[data-t]'));
    tokEl = isEnd ? all[all.length - 1] : all[0];
    if (!tokEl) return null;
    return Number(tokEl.dataset.t);
  }
  let idx = Number(tokEl.dataset.t);
  // 終端がテキストノードの先頭(offset 0)なら、実際には1つ前のトークンまでが選択範囲
  if (isEnd && node.nodeType === 3 && offset === 0) idx -= 1;
  return idx;
}

export default function Reader({ session, onBack, onWordbookChanged, onMaterialsChanged }) {
  const { text, lang, meta, source, level, genre } = session;
  const tokens = useMemo(() => tokenize(text, lang), [text, lang]);

  // highlights: [{ id, start, end, text, entry|null }]（start/end はトークン番号・両端含む）
  const [highlights, setHighlights] = useState([]);
  // popup:
  //  word : { id, kind:'word', hid, anchorTop, anchorBottom, anchorX }（本文内に出る小窓）
  //  range: { id, kind:'range', text, result|null, card:'bottom'|'top' }（画面固定カード）
  const [popup, setPopup] = useState(null);
  const settings = useMemo(loadSettings, []); // ホームの「設定」で決めた内容（色分けなど）
  const [alwaysDetail, setAlwaysDetail] = useState(loadAlwaysDetail); // 「いつも詳しく」設定
  const [openDetailId, setOpenDetailId] = useState(null); // 「詳しく見る」を開いた小窓の id
  const [openTableId, setOpenTableId] = useState(null); // 活用表を開いた小窓の id
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  // 日本語訳（各段落の直下に表示）
  const [showTrans, setShowTrans] = useState(false);
  const [sentTrans, setSentTrans] = useState(null); // 段落ごとの文リスト [[{start,end,ja}]] | null

  // マイ教材
  const [displayTitle, setDisplayTitle] = useState(session.title);
  const [materialId, setMaterialId] = useState(session.materialId ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const bodyRef = useRef(null);
  const popupRef = useRef(null);
  const idRef = useRef(0);
  const downRef = useRef(null); // 直近のポインタ操作 { x, y, t, moved, selected, hadSelection }
  const lastSelKey = useRef(null);
  const lastTap = useRef(null); // 直前の有効なタップ { t, x, y, undo }
  const guardUntil = useRef(0); // この時刻までタップ判定を無効にする

  // 段落（空行で区切る）。各段落の下に訳を並べるために使う
  const paragraphs = useMemo(() => {
    const out = [];
    let cur = [];
    const flush = () => {
      if (cur.some((t) => t.type === 'word' || t.type === 'punct')) out.push(cur);
      cur = [];
    };
    // 改行トークンは1つずつ来ることがあるので、「連続する改行の合計が2以上」で段落を区切る
    let pending = []; // 連続中の改行トークン
    const newlines = (ts) => ts.reduce((n, t) => n + (t.text.match(/\n/g) || []).length, 0);
    for (const t of tokens) {
      if (t.type === 'break' || (pending.length > 0 && t.type === 'space')) {
        pending.push(t);
        continue;
      }
      if (pending.length > 0) {
        if (newlines(pending) >= 2) flush();
        else cur.push(...pending.filter((x) => x.type === 'break'));
        pending = [];
      }
      cur.push(t);
    }
    flush();
    return out.map((toks) => {
      let c = 0;
      const starts = toks.map((t) => {
        const st = c;
        c += t.text.length;
        return st;
      });
      return { tokens: toks, starts, text: toks.map((t) => t.text).join('') };
    });
  }, [tokens]);

  // トークン番号 -> ハイライトid
  const hlByToken = useMemo(() => {
    const map = new Map();
    for (const h of highlights) for (let i = h.start; i <= h.end; i++) map.set(i, h.id);
    return map;
  }, [highlights]);

  // ハイライトごとの色（品詞で色分け。辞書の結果が届くまでは標準の黄色）
  const hlColors = useMemo(() => {
    const m = new Map();
    for (const h of highlights) m.set(h.id, highlightColor(settings, h.entry));
    return m;
  }, [highlights, settings]);

  const popupHl = popup?.kind === 'word' ? highlights.find((h) => h.id === popup.hid) : null;

  const selectionInArticle = () => {
    const sel = window.getSelection();
    return !!sel && !sel.isCollapsed && !!bodyRef.current?.contains(sel.anchorNode);
  };

  const clearSelection = () => {
    lastSelKey.current = null;
    window.getSelection()?.removeAllRanges();
  };

  const closeRange = () => {
    clearSelection();
    setPopup(null);
  };

  // ---- 日本語訳の表示切り替え（初回だけ取得）----
  const toggleTrans = async () => {
    const next = !showTrans;
    setShowTrans(next);
    setPopup(null); // 段落の高さが変わるので、位置を持つ小窓は閉じる
    clearSelection();
    if (next && !sentTrans) {
      setSentTrans(await translateSentences(paragraphs.map((p) => p.text), lang));
    }
  };

  // 直前のタップ（ハイライト付与/解除）を取り消す。選択操作の前触れだったと分かった時に使う
  const undoLastTap = useCallback(() => {
    const lt = lastTap.current;
    lastTap.current = null;
    if (lt && Date.now() - lt.t < UNDO_WINDOW_MS) lt.undo();
  }, []);

  // 「選択操作が始まった」ことを検知した時の共通処理
  const signalSelection = useCallback(() => {
    guardUntil.current = Date.now() + SELECTION_GUARD_MS;
    if (downRef.current) downRef.current.selected = true;
    undoLastTap();
  }, [undoLastTap]);

  // ---- ポインタ操作の記録（タップ vs 長押し/ドラッグの判定材料）----
  const onPointerDown = (e) => {
    const now = Date.now();
    // 近い位置での2回目のタップ = ダブルタップ（スマホでは単語選択の前触れ）。
    // 1回目で付いたハイライトを取り消し、この2回目の click もタップとして扱わない。
    const lt = lastTap.current;
    const doubleTap =
      !!lt &&
      now - lt.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < DOUBLE_TAP_DIST;
    if (doubleTap) {
      undoLastTap();
      guardUntil.current = now + SELECTION_GUARD_MS;
    }
    downRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: now,
      moved: false,
      selected: false,
      doubleTap,
      pointerType: e.pointerType,
      hadSelection: selectionInArticle(),
    };
  };
  const onPointerMove = (e) => {
    const d = downRef.current;
    if (d && !d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOVE_TOLERANCE) d.moved = true;
  };
  const onPointerCancel = () => {
    if (downRef.current) downRef.current.moved = true; // スクロール開始など
  };
  const onContextMenu = () => signalSelection(); // 長押しメニュー = 選択操作

  // ---- タップ処理（イベント委譲）----
  const handleBodyClick = useCallback(
    (e) => {
      const d = downRef.current;
      // 長押し・ドラッグ・テキスト選択の一部として飛んできた click はタップとして扱わない
      if (!d || d.moved || d.selected || d.doubleTap || Date.now() - d.t > LONG_PRESS_MS) return;
      // 選択操作を検知した直後は、単語のクリックを完全に無効化
      if (Date.now() < guardUntil.current) return;

      // 選択が残っている状態でのタップ：選択と小窓を閉じるだけ（ハイライトは付けない）
      if (d.hadSelection || selectionInArticle()) {
        closeRange();
        return;
      }

      const el = e.target.closest('[data-i]');
      if (!el) {
        setPopup(null); // 余白タップ：小窓だけ閉じる
        return;
      }
      const i = Number(el.dataset.i);

      // ① ハイライト済み → 解除
      const existing = hlByToken.get(i);
      if (existing) {
        const removed = highlights.find((h) => h.id === existing);
        setHighlights((hs) => hs.filter((h) => h.id !== existing));
        setPopup(null);
        lastTap.current = {
          t: Date.now(),
          x: e.clientX,
          y: e.clientY,
          undo: () => setHighlights((hs) => (hs.some((h) => h.id === removed.id) ? hs : [...hs, removed])),
        };
        return;
      }

      // ② 新規：文脈を考慮して熟語・表現の範囲を決める
      const { start, end } = findRange(tokens, i, lang);
      const phrase = tokens
        .slice(start, end + 1)
        .map((t) => t.text)
        .join('');
      const id = ++idRef.current;

      const replaced = highlights.filter((h) => !(h.end < start || h.start > end));
      setHighlights((hs) => [
        // 重なる既存ハイライト（例: 単語→熟語に広がった場合）は置き換える
        ...hs.filter((h) => h.end < start || h.start > end),
        { id, start, end, text: phrase, entry: null },
      ]);
      lastTap.current = {
        t: Date.now(),
        x: e.clientX,
        y: e.clientY,
        undo: () => {
          setHighlights((hs) => [...hs.filter((h) => h.id !== id), ...replaced]);
          setPopup((p) => (p?.hid === id ? null : p));
        },
      };

      const bRect = bodyRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPopup({
        id,
        kind: 'word',
        hid: id,
        anchorTop: r.top - bRect.top,
        anchorBottom: r.bottom - bRect.top,
        anchorX: r.left + r.width / 2 - bRect.left,
      });

      const context = sentenceAround(tokens, start, end);
      lookupWord(phrase, lang, context).then((entry) => {
        setHighlights((hs) => hs.map((h) => (h.id === id ? { ...h, entry } : h)));
      });
    },
    [hlByToken, highlights, tokens, lang],
  );

  // ---- 長押し／ドラッグ選択 → 範囲の翻訳（画面固定カードに表示）----
  const evalSelection = useCallback(() => {
    const art = bodyRef.current;
    const sel = window.getSelection();
    if (!art || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const a = tokenFromBoundary(range.startContainer, range.startOffset, art, false);
    const b = tokenFromBoundary(range.endContainer, range.endOffset, art, true);
    if (a == null || b == null) return;

    let start = Math.min(a, b);
    let end = Math.max(a, b);
    const blank = (t) => t.type === 'space' || t.type === 'break';
    while (start <= end && blank(tokens[start])) start++;
    while (end >= start && blank(tokens[end])) end--;
    if (start > end) return;
    if (!tokens.slice(start, end + 1).some((t) => t.type === 'word')) return;

    const key = `${start}-${end}`;
    if (lastSelKey.current === key) return; // 同じ範囲は再取得しない
    lastSelKey.current = key;

    const selText = tokens
      .slice(start, end + 1)
      .map((t) => (t.type === 'break' ? ' ' : t.text))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    // 選択範囲に被らない側（下を優先）にカードを出す
    const rects = range.getClientRects();
    const first = rects[0] ?? range.getBoundingClientRect();
    const last = rects[rects.length - 1] ?? first;
    const roomBelow = window.innerHeight - last.bottom;
    const roomAbove = first.top - HEADER_H;
    const card = roomBelow >= CARD_ROOM || roomAbove < CARD_ROOM ? 'bottom' : 'top';

    const id = ++idRef.current;
    setPopup({ id, kind: 'range', text: selText, result: null, card });

    translateSelection(selText, lang, sentenceAround(tokens, start, end)).then((result) => {
      setPopup((p) => (p && p.id === id ? { ...p, result } : p));
    });
  }, [tokens, lang]);

  useEffect(() => {
    let timer;
    const onChange = () => {
      window.clearTimeout(timer);
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        lastSelKey.current = null; // 選択が解除された
        return;
      }
      if (bodyRef.current?.contains(sel.anchorNode)) {
        signalSelection(); // 進行中のタップを無効化／直前のタップを取り消し
        timer = window.setTimeout(evalSelection, SELECTION_DEBOUNCE_MS);
      }
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('selectionchange', onChange);
    };
  }, [evalSelection, signalSelection]);

  // ---- 単語小窓の位置決め（画面下にはみ出すなら上側に出す）----
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (popup?.kind !== 'word' || !el || !bodyRef.current) return;
    const bRect = bodyRef.current.getBoundingClientRect();
    const h = el.offsetHeight;
    const w = el.offsetWidth;

    let top = popup.anchorBottom + 8;
    const wouldOverflowBottom = bRect.top + top + h > window.innerHeight - 12;
    const roomAbove = bRect.top + popup.anchorTop - h - 8 > HEADER_H + 4;
    if (wouldOverflowBottom && roomAbove) top = popup.anchorTop - h - 8;

    const left = Math.max(0, Math.min(popup.anchorX - w / 2, bRect.width - w));
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.visibility = 'visible';
  }, [popup, popupHl?.entry, openDetailId, openTableId, alwaysDetail]);

  // ---- トースト ----
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // ---- 単語の保存 ----
  const handleSave = async () => {
    if (highlights.length === 0 || saving) return;
    setSaving(true);
    setPopup(null);
    try {
      const items = await Promise.all(
        highlights.map(async (h) => {
          const context = sentenceAround(tokens, h.start, h.end);
          const entry = h.entry ?? (await lookupWord(h.text, lang, context));
          return {
            lang, // 教材／AI生成で選んだ言語に自動で紐づく
            text: h.text,
            lemma: entry.lemma,
            pos: entry.pos,
            meaning: entry.meaning,
            conj: entry.conj,
            context,
            // どの文章から来た単語か（単語帳で文章ごとのフォルダーになる）
            sourceKey: session.sourceKey ?? textKey(text),
            sourceTitle: session.sourceTitle ?? displayTitle,
            materialId: materialId ?? undefined,
          };
        }),
      );
      const { added, skipped, list } = addToWordbook(items);
      onWordbookChanged?.(list.length);
      showToast(
        skipped > 0
          ? `${added}語を保存しました（${skipped}語は保存済み）`
          : `${added}語を単語帳に保存しました（20分後から復習できます）`,
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- 文章（ライブラリ）の保存 ----
  const saveMaterialAs = (title, { instant = false } = {}) => {
    const wasSaved = !!materialId;
    const { record, list } = upsertMaterial({
      id: materialId,
      title,
      text,
      lang,
      source,
      level,
      genre,
    });
    setMaterialId(record.id);
    setDisplayTitle(record.title);
    onMaterialsChanged?.(list.length);
    setSheetOpen(false);
    showToast(
      wasSaved
        ? 'タイトルを変更しました'
        : instant
          ? `「${record.title}」をライブラリに保存しました`
          : 'ライブラリに保存しました',
    );
  };

  // AI生成の文章は、AIが付けたタイトルでワンタップ保存（タイトルは後から一覧で変更できる）。
  // ペーストした文章／保存済みの文章は、タイトル入力（画面上部）を開く。
  const handleSaveMaterialClick = () => {
    if (!materialId && source === 'ai') saveMaterialAs(displayTitle, { instant: true });
    else setSheetOpen(true);
  };

  // ---- 描画 ----
  const renderToken = (t) => {
    if (t.type === 'break') return <br key={t.i} data-t={t.i} />;
    const hid = hlByToken.get(t.i);
    const clickable = t.type === 'word' || (t.type === 'space' && hid !== undefined);
    const cls = [t.type === 'word' ? 'w' : '', hid !== undefined ? 'hl' : '']
      .filter(Boolean)
      .join(' ');
    const color = hid !== undefined ? hlColors.get(hid) : null;
    const style = color ? { '--pen': color, '--pen-edge': `color-mix(in srgb, ${color} 80%, #000)` } : undefined;
    return (
      <span
        key={t.i}
        className={cls || undefined}
        style={style}
        data-t={t.i}
        data-i={clickable ? t.i : undefined}
      >
        {t.text}
      </span>
    );
  };

  const range = popup?.kind === 'range' ? popup : null;

  return (
    <div className="screen reader">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack} aria-label="戻る">
          ← 戻る
        </button>
        <h2 className="title">{displayTitle}</h2>
        <button
          className="btn primary small"
          onClick={handleSave}
          disabled={highlights.length === 0 || saving}
          aria-label="ハイライトした単語を保存"
        >
          保存{highlights.length > 0 ? ` (${highlights.length})` : ''}
        </button>
      </header>

      {meta?.note && <div className="note">{meta.note}</div>}

      <main className={'content' + (range ? ' has-card' : '')}>
        {/* 上部に固定する操作バー：保存／日本語訳の切り替え */}
        <div className="action-row">
          <button
            className={'material-save' + (materialId ? ' saved' : '')}
            onClick={handleSaveMaterialClick}
            data-testid="save-material"
          >
            {materialId ? '✓ 保存済み（タイトル変更）' : '📚 この文章を保存'}
          </button>
          <button
            className={'trans-toggle' + (showTrans ? ' on' : '')}
            onClick={toggleTrans}
            aria-pressed={showTrans}
            data-testid="trans-toggle"
          >
            {showTrans ? '🌐 日本語訳を隠す' : '🌐 日本語訳を表示'}
          </button>
        </div>
        <div className="speed-row">🔊 <SpeedSwitch /></div>

        <p className="reader-tip">
          タップ：単語の意味＋ハイライト（再タップで解除） ／ 長押し・ドラッグ：選んだ文やフレーズを翻訳
        </p>

        <article
          ref={bodyRef}
          className="reading"
          lang={lang}
          dir={lang === 'ar' ? 'rtl' : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerCancel={onPointerCancel}
          onContextMenu={onContextMenu}
          onDoubleClick={signalSelection}
          onMouseUp={() => window.setTimeout(evalSelection, 0)}
          onClick={handleBodyClick}
          data-testid="reading"
        >
          {paragraphs.map((para, k) => {
            // 訳の表示中は、文ごとにブロックにして、その真下に訳を置く
            const sents = showTrans ? sentTrans?.[k] : null;
            if (sents) {
              return (
                <div className="para" key={k}>
                  {sents.map((st, j) => (
                    <div className="sent-block" key={j}>
                      <div className="sent">
                        {para.tokens
                          .filter((_, i) => para.starts[i] >= st.start && para.starts[i] < st.end)
                          .map(renderToken)}
                      </div>
                      <div className="sent-trans" lang="ja" data-testid="sent-trans">
                        <SpeakButton
                          className="sent-speak"
                          lang={lang}
                          text={para.tokens.filter((_, i) => para.starts[i] >= st.start && para.starts[i] < st.end).map((t) => t.text).join('').trim()}
                        />
                        {st.ja ?? <span className="sent-trans-note">（モック未対応）</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <React.Fragment key={k}>
                <div className="para">{para.tokens.map(renderToken)}</div>
                {showTrans && (
                  <div className="sent-trans" lang="ja">
                    <span className="sent-trans-note">翻訳しています…</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {popup?.kind === 'word' && popupHl && (
            <div
              key={popup.id}
              ref={popupRef}
              className="popup"
              role="dialog"
              onClick={(e) => {
                e.stopPropagation();
                setPopup(null); // 小窓だけ閉じる（ハイライトは残す）
              }}
            >
              <div className="popup-head">
                <span className="popup-text">{popupHl.text}</span>
                <SpeakButton text={popupHl.text} lang={lang} />
                {popupHl.entry && popupHl.entry.lemma !== popupHl.text && (
                  <span className="popup-lemma">← {popupHl.entry.lemma}</span>
                )}
              </div>
              {popupHl.entry ? (
                <>
                  {settings.showReading && <Reading pron={popupHl.entry.pron} />}
                  <div className="popup-pos">
                    {settings.colorByPos && popupHl.entry.found !== false && (
                      <span className="pos-dot" style={{ background: settings.colors[posCategory(popupHl.entry.pos)] }} aria-hidden="true" />
                    )}
                    {popupHl.entry.pos}
                  </div>
                  <FormTags
                    tags={popupHl.entry.formTags}
                    open={openTableId === popup.id}
                    onToggle={popupHl.entry.table ? () => setOpenTableId((id) => (id === popup.id ? null : popup.id)) : undefined}
                  />
                  {openTableId === popup.id && popupHl.entry.table && <ConjTable table={popupHl.entry.table} />}
                  <div className="popup-meaning">{popupHl.entry.meaning}</div>
                  {popupHl.entry.conj && <div className="popup-conj">{popupHl.entry.conj}</div>}
                  <WordDetail
                    detail={popupHl.entry}
                    open={openDetailId === popup.id}
                    always={alwaysDetail}
                    onToggle={() => setOpenDetailId((id) => (id === popup.id ? null : popup.id))}
                  />
                </>
              ) : (
                <div className="popup-loading">調べています…</div>
              )}
              <div className="popup-foot">
                <label className="popup-always" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={alwaysDetail}
                    onChange={(e) => {
                      setAlwaysDetail(e.target.checked);
                      saveAlwaysDetail(e.target.checked);
                    }}
                  />
                  いつも詳しく表示
                </label>
                <span>タップで閉じる</span>
              </div>
            </div>
          )}
        </article>

      </main>

      {/* 範囲選択の翻訳：画面に固定。OSのコピーメニュー（選択範囲の近く）と重ならない */}
      {range && (
        <aside
          className={'range-card ' + range.card}
          role="dialog"
          aria-label="選択範囲の翻訳"
          data-testid="range-card"
        >
          <button className="range-close" onClick={closeRange} aria-label="閉じる">
            ✕
          </button>
          <div className="popup-pos">
            選択範囲の翻訳{range.result?.kind === 'sentence' ? '（文）' : '（フレーズ）'}
          </div>
          <div className="popup-src">
            {range.text}
            <SpeakButton className="range-speak" lang={lang} text={range.text} />
          </div>
          {range.result ? (
            <>
              <div className="popup-meaning">{range.result.text}</div>
              {range.result.note && <div className="popup-note">{range.result.note}</div>}
              {range.result.sentence && (
                <div className="popup-conj">この文の訳：{range.result.sentence}</div>
              )}
            </>
          ) : (
            <div className="popup-loading">翻訳しています…</div>
          )}
        </aside>
      )}

      {sheetOpen && (
        <TitleSheet
          heading={materialId ? 'タイトルを変更' : 'この文章を保存'}
          initial={displayTitle}
          confirmLabel={materialId ? '変更する' : '保存する'}
          onSave={(t) => saveMaterialAs(t)}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
