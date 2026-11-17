// ===== モック翻訳 =====
// 本番では translateFull / translateSelection を AI 翻訳APIに差し替える。
// モックでは storyAI.js の文ペア（CORPUS）から訳を組み立てる。

import { CORPUS } from './storyAI.js';
import { lookupWord } from './dictionary.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// 句読点・空白・大文字小文字の違いを無視して比較するための正規化
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const FALLBACK_FULL =
  '（モック翻訳）この文章の日本語訳は、本番ではここにAI翻訳が表示されます。';

// 1つの文章（または段落）の訳を、モックのコーパスから組み立てる（同期）。{ text, complete }
function matchFull(text, lang) {
  const found = [];
  for (const p of CORPUS) {
    if (p.lang !== lang) continue;
    const pos = text.indexOf(p.src);
    if (pos >= 0) found.push({ pos, end: pos + p.src.length, ja: p.ja, len: norm(p.src).length });
  }
  if (found.length === 0) return { text: FALLBACK_FULL, complete: false };

  found.sort((a, b) => a.pos - b.pos);
  let out = '';
  let prevEnd = null;
  let covered = 0;
  for (const f of found) {
    if (prevEnd !== null && f.pos >= prevEnd) {
      out += text.slice(prevEnd, f.pos).includes('\n') ? '\n' : '';
    }
    out += f.ja;
    prevEnd = f.end;
    covered += f.len;
  }
  return { text: out, complete: covered >= norm(text).length * 0.95 };
}

// 全体訳: { text, complete }
export async function translateFull(text, lang) {
  await delay(250);
  return matchFull(text, lang);
}

// 段落ごとの訳（原文の各段落の直下に並べて表示する用）: [{ text, complete }, ...]
// 本番では、段落配列をまとめて AI 翻訳に渡して同じ形で返せばよい。
export async function translateParagraphs(paragraphs, lang) {
  await delay(250);
  return paragraphs.map((p) => matchFull(p, lang));
}

// 文ごとの訳（各文の真下に並べて表示する用）。
// 入力: 段落テキストの配列。出力: 段落ごとの文リスト [{ start, end, ja|null }]（start/end は段落テキスト内の文字位置）。
// 本番では「文の分割＋翻訳」を AI に任せ、同じ形（文字位置つき）で返せばよい。
// モックでは、既知の文（CORPUS）をそのまま文として使い、それ以外は句読点で分割する。
const SENT_RE = /[^.!?。！？]+[.!?。！？]+["”’»」』)\]]*|[^.!?。！？]+$/g;

function splitSentences(text, lang) {
  const hits = [];
  for (const p of CORPUS) {
    if (p.lang !== lang) continue;
    const pos = text.indexOf(p.src);
    if (pos >= 0) hits.push({ start: pos, end: pos + p.src.length, ja: p.ja });
  }
  hits.sort((a, b) => a.start - b.start);
  // 重なりを除く
  const kept = [];
  for (const h of hits) if (!kept.length || h.start >= kept[kept.length - 1].end) kept.push(h);

  const out = [];
  const pushGap = (from, to) => {
    const gap = text.slice(from, to);
    for (const m of gap.matchAll(SENT_RE)) {
      const raw = m[0];
      const lead = raw.length - raw.trimStart().length;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      out.push({ start: from + m.index + lead, end: from + m.index + lead + trimmed.length, ja: null });
    }
  };
  let cursor = 0;
  for (const h of kept) {
    pushGap(cursor, h.start);
    out.push(h);
    cursor = h.end;
  }
  pushGap(cursor, text.length);
  return out;
}

export async function translateSentences(paragraphTexts, lang) {
  await delay(250);
  return paragraphTexts.map((t) => splitSentences(t, lang));
}

// 選択範囲の訳: { kind: 'sentence' | 'phrase', text, note, sentence }
//  - 1文以上を丸ごと含む選択 → その文の訳
//  - 文の一部（フレーズ） → 辞書にあればその意味、なければ未対応 + 含まれる文の訳
export async function translateSelection(selection, lang, context = '') {
  await delay(250);
  const n = norm(selection);
  const pairs = CORPUS.filter((p) => p.lang === lang);

  const covered = pairs
    .filter((p) => n.includes(norm(p.src)))
    .sort((a, b) => n.indexOf(norm(a.src)) - n.indexOf(norm(b.src)));
  if (covered.length > 0) {
    const coveredLen = covered.reduce((s, p) => s + norm(p.src).length, 0);
    return {
      kind: 'sentence',
      text: covered.map((p) => p.ja).join(''),
      note: coveredLen < n.length * 0.9 ? '選択範囲に含まれる文の訳です' : '',
    };
  }

  const host = n ? pairs.find((p) => norm(p.src).includes(n)) : null;
  const dict = await lookupWord(selection, lang, context);
  if (dict.found) {
    return {
      kind: 'phrase',
      text: dict.meaning,
      note: dict.lemma !== selection ? `原形: ${dict.lemma}` : '',
      sentence: host?.ja,
    };
  }
  return {
    kind: 'phrase',
    text: host
      ? '（モック）このフレーズ単体の訳は未対応です'
      : '（モック翻訳）本番ではここにAI翻訳が表示されます',
    note: '',
    sentence: host?.ja,
  };
}
