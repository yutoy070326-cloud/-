// 入力された文字列（題名・本文）から学習言語を推定する軽量な判定。
// 文字の種類（かな・ハングル・ラテン文字の特徴）と、よく出る単語で判断する。
// 自信がないときは null を返す（言語を勝手に切り替えない）。

const STOP = {
  en: 'the of and a to in is it you i my that was for on with he she we are not this but all have had there one when were be at by from or an his her your will what who how why do does did can could would our they them its'.split(' '),
  es: 'el la los las de y en un una que por con para es se no su al lo como más pero sus ya fue este mi tu yo del está hay muy hoy son una cuando donde tiene sin sobre entre'.split(' '),
  fr: 'le la les des et un une du de que pour est dans qui pas je il elle nous vous sur avec ce se au aux mon ma sont très être mais ou où ses son leur comme tout'.split(' '),
  de: 'der die das und ein eine ist nicht ich zu mit den von auf für sie es er wir dem des im ihr auch wie nach bei aus noch wird sind war'.split(' '),
  id: 'yang dan di ke dari ini itu dengan untuk tidak saya kamu dia kami mereka adalah akan sudah ada pada juga atau tetapi karena bisa apa siapa mengapa bagaimana hari sekolah teman buku'.split(' '),
  tl: 'ang ng sa na at ay mga ako ikaw siya kami kayo sila ito iyon hindi para may mayroon ni kay lang din rin pero kasi ano sino bakit paano araw paaralan kaibigan libro'.split(' '),
};

const count = (s, re) => (s.match(re) ?? []).length;

// current: いま選んでいる言語。漢字だけの文は、日本語を選んでいる間は日本語のまま、それ以外は中国語とみなす
export function detectLanguage(text, current) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  const kana = count(s, /[぀-ヿㇰ-ㇿ]/g);
  const hangul = count(s, /[가-힯ᄀ-ᇿ㄰-㆏]/g);
  const han = count(s, /[一-鿿]/g);
  const latin = count(s, /[A-Za-zÀ-ɏ]/g);

  const thai = count(s, /[฀-๿]/g);
  const cyr = count(s, /[Ѐ-ӿ]/g);
  const arab = count(s, /[؀-ۿݐ-ݿ]/g);
  if (thai > 0 && thai >= latin) return 'th';
  if (cyr > 0 && cyr >= latin) return 'ru';
  if (arab > 0 && arab >= latin) return 'ar';
  if (kana > 0) return 'ja'; // かなが1文字でもあれば日本語
  if (hangul > 0 && hangul >= han) return 'ko';
  if (han > 0 && latin === 0) return current === 'ja' ? 'ja' : 'zh'; // かなが無い漢字だけの文は中国語（日本語の文にはほぼ必ずかなが入る）
  if (latin < 3) return null;

  const lower = s.toLowerCase();
  const score = { en: 0, es: 0, fr: 0, de: 0, id: 0, tl: 0 };
  score.es += 3 * count(lower, /[ñ¿¡]/g) + count(lower, /[áíóú]/g);
  score.fr += count(lower, /[àâçèêëîïôûùœ]/g) * 1.5;
  score.de += 3 * count(lower, /ß/g) + 1.5 * count(lower, /[äöü]/g);
  if (/é/.test(lower)) { score.es += 0.5; score.fr += 1; }
  const words = lower.match(/[a-zà-ÿ']+/g) ?? [];
  for (const w of words) for (const k of Object.keys(STOP)) if (STOP[k].includes(w)) score[k] += 1;

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] > 0 && ranked[0][1] > ranked[1][1]) return ranked[0][0];
  // 特徴が何もないASCIIだけの文字列は、英語とみなす
  if (/^[\x00-\x7f]*$/.test(s) && ranked[0][1] === 0) return 'en';
  return null;
}

// 言語に合わせた入力欄の属性（スマホのキーボード・変換候補・自動大文字を最適化する）
const CJK = ['ja', 'ko', 'zh', 'ru', 'ar', 'th'];
const BCP47 = { zh: 'zh-Hans', ja: 'ja', ko: 'ko' };
export function inputHints(lang, { title = false } = {}) {
  const cjk = CJK.includes(lang);
  return {
    lang: BCP47[lang] ?? lang ?? 'en',
    spellCheck: !cjk,
    autoCorrect: cjk ? 'off' : 'on',
    autoCapitalize: cjk ? 'off' : title ? 'words' : 'sentences',
  };
}
