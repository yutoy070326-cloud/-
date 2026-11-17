// 読み（拼音・ローマ字）。中国語は拼音、ほかのローマ字でない言語はローマ字（ラテン文字）で発音を表示する。
// 韓国語（ハングル）・ロシア語（キリル文字）・日本語（かな）は規則で変換できる。
// 中国語（漢字→拼音）・アラビア語（母音が書かれない）・日本語の漢字は、辞書の「読み」が必要。
// 本物の辞書／AIをつなぐときは、辞書が返す読みを entry.reading に入れる。

export const READING_LANGS = ['zh', 'ja', 'ko', 'ru', 'ar', 'th'];

// ---------- 韓国語（改訂ローマ字・簡易版：連音・鼻音化・流音化の基本のみ） ----------
const KO_INIT = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const KO_VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
// 終声 → ローマ字（語末・子音の前）
const KO_FINAL = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
// 終声が次の母音に移るとき（連音）の、移る先の初声番号。-1 は移らない（ㅇ・ㅎ）
const KO_FINAL_TO_INIT = [-1, 0, 1, 9, 2, 12, -1, 3, 5, 0, 6, 7, 9, 16, 17, -1, 6, 7, 9, 10, -1, 12, 14, 15, 16, 17, -1].map((v, i) => (i === 21 ? -1 : v));

function romanizeKorean(text) {
  const syl = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const n = c - 0xac00;
      syl.push({ i: Math.floor(n / 588), v: Math.floor((n % 588) / 28), t: n % 28, raw: null });
    } else syl.push({ raw: ch });
  }
  let out = '';
  for (let k = 0; k < syl.length; k++) {
    const s = syl[k];
    if (s.raw !== null) { out += s.raw; continue; }
    const next = syl[k + 1];
    let init = s.i;
    let fin = s.t;
    // 連音：前の音節の終声が、ㅇで始まるこの音節に移る
    const prev = syl[k - 1];
    let initStr = KO_INIT[init];
    if (prev && prev.raw === null && prev.moved >= 0) initStr = KO_INIT[prev.moved];
    let finStr = KO_FINAL[fin];
    s.moved = -1;
    if (next && next.raw === null && fin && next.i === 11) {
      const to = KO_FINAL_TO_INIT[fin];
      if (to >= 0) { s.moved = to; finStr = ''; } // 次の音節へ移す
      else if (fin === 6) { finStr = 'n'; } // ㄶ
      else if (fin === 27) { finStr = ''; } // ㅎ は母音の前で発音されない
      else if (fin === 15) { finStr = 'l'; } // ㅀ
    } else if (next && next.raw === null && fin) {
      // 鼻音化（ㅂ・ㄱ・ㄷ系 + ㄴ・ㅁ）と流音化（ㄴ+ㄹ）
      const nInit = next.i;
      if ((nInit === 2 || nInit === 6) && ['p', 'k', 't'].includes(finStr)) finStr = { p: 'm', k: 'ng', t: 'n' }[finStr];
      if (nInit === 5 && finStr === 'n') finStr = 'l';
    }
    // 次の音節の初声が、前から移ってきたものなら、この音節の初声として使う（ㅇの位置に入る）
    if (prev && prev.raw === null && prev.moved >= 0 && init === 11) initStr = KO_INIT[prev.moved];
    else initStr = KO_INIT[init];
    // ㄹ が語頭以外・前の音節が ㄹ のとき l（簡易）
    if (init === 5 && prev && prev.raw === null && KO_FINAL[prev.t] === 'l') initStr = 'l';
    out += initStr + KO_VOWEL[s.v] + finStr;
  }
  return out;
}

// ---------- ロシア語 ----------
const RU = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
function romanizeRussian(text) {
  let out = '';
  for (const ch of text) {
    const lower = ch.toLowerCase();
    if (RU[lower] === undefined) { out += ch; continue; }
    const r = RU[lower];
    out += ch !== lower ? r.charAt(0).toUpperCase() + r.slice(1) : r;
  }
  return out;
}

// ---------- 日本語（かな → ヘボン式ローマ字。漢字は辞書の読みが必要） ----------
const KANA_BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};
const KANA_SMALL = { ゃ: 'ya', ゅ: 'yu', ょ: 'yo' };
const toHiragana = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function romanizeKana(text) {
  const s = toHiragana(text);
  const chars = [...s];
  let out = '';
  let geminate = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === 'っ') { geminate = true; continue; }
    if (c === 'ー') {
      const m = out.match(/[aiueo]$/);
      if (m) out = out.slice(0, -1) + { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' }[m[0]];
      continue;
    }
    let r = KANA_BASE[c];
    if (r === undefined) { out += c; geminate = false; continue; }
    if (KANA_SMALL[chars[i + 1]]) {
      // きゃ → kya, しゃ → sha, ちゃ → cha, じゃ → ja
      const y = KANA_SMALL[chars[i + 1]];
      const base = r.endsWith('i') ? r.slice(0, -1) : r;
      r = ['sh', 'ch', 'j'].includes(base) ? base + y.slice(1) : base + y;
      i += 1;
    }
    if (geminate) { r = (r.startsWith('ch') ? 't' : r[0]) + r; geminate = false; }
    out += r;
  }
  return out;
}

const hasKanaOnly = (s) => /^[ぁ-ゟァ-ヿー\s]+$/.test(s);

// 返り値: { label: '拼音' | 'ローマ字', text } | null
// raw: 辞書に入っている読み（zh: 拼音 / ja: ひらがな / ar: ローマ字）
export function readingInfo(lang, text, raw) {
  if (!READING_LANGS.includes(lang)) return null;
  const t = String(text ?? '').trim();
  if (!t) return null;
  if (lang === 'zh') return raw ? { label: '拼音', text: raw } : null;
  if (lang === 'ar' || lang === 'th') return raw ? { label: 'ローマ字', text: raw } : null; // 母音・声調の表記が必要なので、辞書の読みが要る
  if (lang === 'ja') {
    if (raw) return { label: 'ローマ字', text: romanizeKana(raw) };
    return hasKanaOnly(t) ? { label: 'ローマ字', text: romanizeKana(t) } : null;
  }
  if (lang === 'ko') {
    const r = raw || (/[가-힣]/.test(t) ? romanizeKorean(t) : '');
    return r ? { label: 'ローマ字', text: r } : null;
  }
  if (lang === 'ru') {
    const r = raw || (/[Ѐ-ӿ]/.test(t) ? romanizeRussian(t) : '');
    return r ? { label: 'ローマ字', text: r } : null;
  }
  return null;
}
