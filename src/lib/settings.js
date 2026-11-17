// 端末ごとの設定（バックアップ対象外なのでキーはハイフン区切り）。
// ホームの「設定」から変更する。
const KEY = 'lingo-reader-settings:v1';
const OLD_DETAIL_KEY = 'lingo-reader-detail:v1'; // 以前の「いつも詳しく表示」単独の設定

// ハイライトの色分けに使う品詞グループ
export const POS_CATEGORIES = [
  { id: 'verb', label: '動詞' },
  { id: 'noun', label: '名詞' },
  { id: 'adj', label: '形容詞' },
  { id: 'adv', label: '副詞' },
  { id: 'phrase', label: '熟語・表現' },
  { id: 'other', label: 'その他' },
];

export const DEFAULT_COLORS = {
  verb: '#8ec1ff', // 青
  noun: '#ffe45c', // 黄
  adj: '#9be3ab', // 緑
  adv: '#ffb8cc', // ピンク
  phrase: '#d6b8ff', // 紫
  other: '#d6d2c8', // グレー
};

// 色の選択肢（ここ以外の色は、色選びからも指定できる）
export const COLOR_CHOICES = [
  '#8ec1ff', '#ffe45c', '#9be3ab', '#ffb8cc', '#d6b8ff',
  '#ffc28a', '#8fe3dc', '#d6d2c8', '#ff9e9e', '#c8e86b',
];

export const DEFAULT_SETTINGS = {
  colorByPos: true, // 品詞で色分けする
  colors: DEFAULT_COLORS,
  alwaysDetail: false, // 「詳しく見る」を最初から開く
  genreColors: {}, // ジャンルごとの既定の表紙色（自分で変えた色を覚える）
  speechRate: 1, // 音声の速さ：0.75（ゆっくり）／1（ふつう）／1.25（はやい）
  muteGreeting: false, // 開始・終了のあいさつの声をオフ（テキストのみ）
  showReading: true, // 読み（拼音・ローマ字）を表示する
};

export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    saved = {};
  }
  const s = {
    ...DEFAULT_SETTINGS,
    ...saved,
    colors: { ...DEFAULT_COLORS, ...(saved.colors || {}) },
  };
  if (saved.alwaysDetail === undefined) {
    try {
      s.alwaysDetail = localStorage.getItem(OLD_DETAIL_KEY) === '1';
    } catch {
      /* ignore */
    }
  }
  return s;
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 保存できなくても、その場の動作には影響しない */
  }
  return next;
}

// 辞書の品詞（「動詞」「名詞（女性）」「副詞/形容詞」「句動詞」「表現」など）→ 色分けグループ
export function posCategory(pos) {
  const p = String(pos || '');
  if (/句動詞|表現|名詞句/.test(p)) return 'phrase';
  const first = p.split('/')[0];
  if (/動詞/.test(first)) return 'verb';
  if (/名詞/.test(first)) return 'noun';
  if (/形容詞/.test(first)) return 'adj';
  if (/副詞/.test(first)) return 'adv';
  return 'other';
}

// ハイライトに使う色。色分けがオフ・辞書に載っていない語は null（＝標準の黄色ペン）
export function highlightColor(settings, entry) {
  if (!settings.colorByPos || !entry || entry.found === false) return null;
  return settings.colors[posCategory(entry.pos)] ?? null;
}
