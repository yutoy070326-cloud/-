// あいさつ（開始時）とお見送りのことば（終了時）。ランダムな言語で出す。
// raw: 拼音・ローマ字が規則で作れない言語（中国語・アラビア語）の読み。
import { readingInfo } from './reading.js';

const MORNING = [
  { lang: 'ja', text: 'おはよう', gloss: '' },
  { lang: 'en', text: 'Good morning!', gloss: 'おはよう' },
  { lang: 'es', text: '¡Buenos días!', gloss: 'おはよう' },
  { lang: 'ko', text: '좋은 아침이에요', gloss: 'おはよう' },
  { lang: 'fr', text: 'Bonjour !', gloss: 'おはよう／こんにちは' },
  { lang: 'zh', text: '早上好', gloss: 'おはよう', raw: 'zǎoshang hǎo' },
  { lang: 'de', text: 'Guten Morgen!', gloss: 'おはよう' },
  { lang: 'ru', text: 'Доброе утро!', gloss: 'おはよう' },
  { lang: 'ar', text: 'صباح الخير', gloss: 'おはよう', raw: 'ṣabāḥ al-khayr' },
];
const DAY = [
  { lang: 'ja', text: 'こんにちは', gloss: '' },
  { lang: 'en', text: 'Hello!', gloss: 'こんにちは' },
  { lang: 'es', text: '¡Buenas tardes!', gloss: 'こんにちは' },
  { lang: 'ko', text: '안녕하세요', gloss: 'こんにちは' },
  { lang: 'fr', text: 'Bonjour !', gloss: 'こんにちは' },
  { lang: 'zh', text: '你好', gloss: 'こんにちは', raw: 'nǐ hǎo' },
  { lang: 'de', text: 'Guten Tag!', gloss: 'こんにちは' },
  { lang: 'ru', text: 'Добрый день!', gloss: 'こんにちは' },
  { lang: 'ar', text: 'مرحبا', gloss: 'こんにちは', raw: 'marḥaban' },
];
const EVENING = [
  { lang: 'ja', text: 'こんばんは', gloss: '' },
  { lang: 'en', text: 'Good evening!', gloss: 'こんばんは' },
  { lang: 'es', text: '¡Buenas noches!', gloss: 'こんばんは' },
  { lang: 'ko', text: '좋은 저녁이에요', gloss: 'こんばんは' },
  { lang: 'fr', text: 'Bonsoir !', gloss: 'こんばんは' },
  { lang: 'zh', text: '晚上好', gloss: 'こんばんは', raw: 'wǎnshang hǎo' },
  { lang: 'de', text: 'Guten Abend!', gloss: 'こんばんは' },
  { lang: 'ru', text: 'Добрый вечер!', gloss: 'こんばんは' },
  { lang: 'ar', text: 'مساء الخير', gloss: 'こんばんは', raw: 'masāʾ al-khayr' },
];
const BYE = [
  { lang: 'ja', text: 'またね！', gloss: '' },
  { lang: 'ja', text: 'バイバイ！', gloss: '' },
  { lang: 'ja', text: 'お疲れ様でした', gloss: '' },
  { lang: 'en', text: 'See you!', gloss: 'またね' },
  { lang: 'en', text: 'Good job today!', gloss: '今日はよくがんばったね' },
  { lang: 'es', text: '¡Hasta luego!', gloss: 'またね' },
  { lang: 'es', text: '¡Adiós!', gloss: 'さようなら' },
  { lang: 'ko', text: '또 만나요', gloss: 'また会いましょう' },
  { lang: 'ko', text: '수고했어요', gloss: 'お疲れ様' },
  { lang: 'fr', text: 'À bientôt !', gloss: 'またね' },
  { lang: 'fr', text: 'Au revoir !', gloss: 'さようなら' },
  { lang: 'zh', text: '再见', gloss: 'さようなら', raw: 'zàijiàn' },
  { lang: 'zh', text: '辛苦了', gloss: 'お疲れ様', raw: 'xīnkǔ le' },
  { lang: 'de', text: 'Bis bald!', gloss: 'またね' },
  { lang: 'de', text: 'Tschüss!', gloss: 'バイバイ' },
  { lang: 'ru', text: 'Пока!', gloss: 'バイバイ' },
  { lang: 'ar', text: 'مع السلامة', gloss: 'さようなら', raw: 'maʿa s-salāma' },
];

// 端末の現在時刻 → 'morning'（5〜9時）／'day'（10〜17時）／'evening'（18〜4時）
export function timeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 18) return 'day';
  return 'evening';
}

const POOLS = { morning: MORNING, day: DAY, evening: EVENING, bye: BYE };

// kind: 'morning' | 'day' | 'evening' | 'bye'。返り値: { lang, text, gloss, pron }
export function pickGreeting(kind, rng = Math.random) {
  const pool = POOLS[kind] ?? DAY;
  const g = pool[Math.floor(rng() * pool.length)];
  // 日本語のあいさつは読みを出さない（日本語話者向け）
  return { ...g, pron: g.lang === 'ja' ? null : readingInfo(g.lang, g.text.replace(/[¡!¿?！]/g, ''), g.raw ?? '') };
}
