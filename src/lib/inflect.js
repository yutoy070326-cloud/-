// 活用・語形の判定（モック辞書用）。
// 「この単語は原形から見て何形か」と「活用表」を返す。本番の辞書APIでは、
// API が返す語形情報に置き換える（getDetail / lookupWord が返す形は維持する）。
// 現状は直説法現在形のみ（スペイン語・フランス語）。ほかの時制は未対応。

const norm = (s) => String(s).toLowerCase().replace(/[’‘]/g, "'").trim();

// tags: 何形か・何人称かのラベル（ポップアップで色分けして表示）。tone は色の種類
// tense: 活用表の1つの時制 { id, label, rows, hit }。時制を増やすときは tenses に足していく
function result(tags, tense, note) {
  return {
    form: tags.length ? tags.map((t) => t.label).join('・') : null,
    formTags: tags,
    table: tense ? { title: '活用表', tenses: [tense], note } : null,
  };
}
// 人称ごとに別の色（1人称単数・複数…の6つ）。ラベルも活用表の行も同じ色になる
const personTone = (i) => `p${i}`;

// ---------- 英語 ----------
function enTriple(entry) {
  const parts = String(entry.conj || '').split(' – ').map((s) => s.trim());
  return parts.length === 3 && parts.every(Boolean) ? parts : null;
}

function enInfo(entry, surface) {
  const lemma = norm(entry.lemma);
  const forms = (entry.forms || []).map(norm);
  const isVerb = /動詞/.test(entry.pos);
  if (!isVerb) {
    // 名詞：原形と違い、s で終わる語は複数形とみなす
    if (/名詞/.test(entry.pos) && surface !== lemma && /s$/.test(surface)) return result([{ label: '複数形', tone: 'plural' }], null);
    return result([], null);
  }
  let triple = enTriple(entry);
  if (!triple) return result([], null);
  // 句動詞（look out of など）：活用は最初の語だけ書かれているので、残りの部分をつなぐ
  const headWord = norm(triple[0]);
  if (headWord !== lemma && lemma.startsWith(headWord + ' ')) {
    const tail = lemma.slice(headWord.length);
    triple = [entry.lemma, triple[1] + tail, triple[2] + tail];
  }
  const past = norm(triple[1]);
  const pp = norm(triple[2]);
  // 句動詞（waking up など）は最初の語で -ing を判定する
  const ing = forms.find((f) => /ing$/.test(f.split(' ')[0]) && f !== lemma);
  const third = forms.find((f) => f !== lemma && f !== past && f !== pp && f !== ing);

  let tags;
  if (surface === lemma) tags = [{ label: '原形（現在形）', tone: 'base' }];
  else if (surface === past && surface === pp) tags = [{ label: '過去形', tone: 'past' }, { label: '過去分詞', tone: 'pp' }];
  else if (surface === past) tags = [{ label: '過去形', tone: 'past' }];
  else if (surface === pp) tags = [{ label: '過去分詞', tone: 'pp' }];
  else if (surface === ing) tags = [{ label: '現在進行形（be + -ing）', tone: 'prog' }];
  else if (surface === third) tags = [{ label: '三人称単数現在形（he／she／it）', tone: 'third' }];
  else tags = [];

  const rows = [{ label: '原形', form: triple[0] }];
  if (third) rows.push({ label: '三人称単数現在', form: third });
  rows.push({ label: '過去形', form: triple[1] }, { label: '過去分詞', form: triple[2] });
  if (ing) rows.push({ label: '現在進行形（-ing）', form: ing });
  const hit = rows.map((r, i) => (norm(r.form) === surface ? i : -1)).filter((i) => i >= 0);
  return result(tags, { id: 'forms', label: '主な語形', rows, hit });
}

// ---------- スペイン語（直説法現在） ----------
const ES_PERSONS = [
  '1人称単数（yo）', '2人称単数（tú）', '3人称単数（él／ella／usted）',
  '1人称複数（nosotros）', '2人称複数（vosotros）', '3人称複数（ellos／ustedes）',
];
const ES_END = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
};
const ES_IRREGULAR = {
  ser: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
  decir: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
  sonreír: ['sonrío', 'sonríes', 'sonríe', 'sonreímos', 'sonreís', 'sonríen'],
  levantarse: ['me levanto', 'te levantas', 'se levanta', 'nos levantamos', 'os levantáis', 'se levantan'],
};
const ES_STEM = { 'e→ie': ['e', 'ie'], 'o→ue': ['o', 'ue'], 'e→i': ['e', 'i'] };

function esTable(entry) {
  const lemma = norm(entry.lemma);
  if (ES_IRREGULAR[lemma]) return ES_IRREGULAR[lemma];
  if (!/動詞/.test(entry.pos) || /[\s+]/.test(lemma)) return null;
  const kind = lemma.slice(-2);
  if (!ES_END[kind]) return null;
  const stem = lemma.slice(0, -2);
  const change = Object.keys(ES_STEM).find((k) => String(entry.conj || '').includes(k));
  return ES_END[kind].map((end, i) => {
    let s = stem;
    if (change && [0, 1, 2, 5].includes(i)) {
      const [from, to] = ES_STEM[change];
      const at = s.lastIndexOf(from);
      if (at >= 0) s = s.slice(0, at) + to + s.slice(at + from.length);
    }
    return s + end;
  });
}

function esInfo(entry, surface) {
  const lemma = norm(entry.lemma);
  const forms = esTable(entry);
  if (!forms) return result([], null);
  const rows = forms.map((f, i) => ({ label: ES_PERSONS[i], form: f, tone: personTone(i) }));
  const hit = forms.map((f, i) => (norm(f) === surface ? i : -1)).filter((i) => i >= 0);
  let tags = [];
  if (surface === lemma) tags = [{ label: '不定詞（原形）', tone: 'base' }];
  else if (hit.length) tags = [{ label: '直説法現在', tone: 'tense' }, ...hit.map((i) => ({ label: ES_PERSONS[i], tone: personTone(i) }))];
  else if (/(ando|iendo)$/.test(surface)) tags = [{ label: '現在分詞（ジェルンディオ）', tone: 'prog' }];
  return result(tags, { id: 'present', label: '直説法現在', rows, hit }, '現在形のみ。ほかの時制は未対応です');
}

// ---------- フランス語（直説法現在） ----------
const FR_PERSONS = [
  '1人称単数（je）', '2人称単数（tu）', '3人称単数（il／elle）',
  '1人称複数（nous）', '2人称複数（vous）', '3人称複数（ils／elles）',
];
const FR_ER = ['e', 'es', 'e', 'ons', 'ez', 'ent'];
const FR_IRREGULAR = {
  aller: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
  acheter: ['achète', 'achètes', 'achète', 'achetons', 'achetez', 'achètent'],
  sourire: ['souris', 'souris', 'sourit', 'sourions', 'souriez', 'sourient'],
  dire: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
};

function frInfo(entry, surface) {
  const lemma = norm(entry.lemma);
  let forms = FR_IRREGULAR[lemma];
  if (!forms && /動詞/.test(entry.pos) && /er$/.test(lemma) && !/\s/.test(lemma)) {
    const stem = lemma.slice(0, -2);
    forms = FR_ER.map((e) => stem + e);
  }
  if (!forms) return result([], null);
  const rows = forms.map((f, i) => ({ label: FR_PERSONS[i], form: f, tone: personTone(i) }));
  const hit = forms.map((f, i) => (norm(f) === surface ? i : -1)).filter((i) => i >= 0);
  let tags = [];
  if (surface === lemma) tags = [{ label: '不定詞（原形）', tone: 'base' }];
  else if (hit.length) tags = [{ label: '直説法現在', tone: 'tense' }, ...hit.map((i) => ({ label: FR_PERSONS[i], tone: personTone(i) }))];
  return result(tags, { id: 'present', label: '直説法現在', rows, hit }, '現在形のみ。ほかの時制は未対応です');
}

// ---------- 人称ごとに動詞の形が変わる言語：ドイツ語・ロシア語・アラビア語（直説法現在） ----------
// 共通の組み立て：forms は persons と同じ並び。tones は人称ごとの色
function personResult(entry, surface, forms, persons, tones, note, infinitiveIsLemma = true) {
  const lemma = norm(entry.lemma);
  const rows = forms.map((f, i) => ({ label: persons[i], form: f, tone: tones[i] }));
  const hit = forms.map((f, i) => (norm(f) === surface ? i : -1)).filter((i) => i >= 0);
  let tags = [];
  if (infinitiveIsLemma && surface === lemma) tags = [{ label: '不定詞（原形）', tone: 'base' }];
  else if (hit.length) tags = [{ label: '直説法現在', tone: 'tense' }, ...hit.map((i) => ({ label: persons[i], tone: tones[i] }))];
  return result(tags, { id: 'present', label: '直説法現在', rows, hit }, note);
}
const T6 = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];

// ドイツ語
const DE_PERSONS = ['1人称単数（ich）', '2人称単数（du）', '3人称単数（er／sie／es）', '1人称複数（wir）', '2人称複数（ihr）', '3人称複数（sie／Sie）'];
const DE_IRREGULAR = {
  sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
  haben: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'],
  werden: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'],
  essen: ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'],
  sprechen: ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'],
  lesen: ['lese', 'liest', 'liest', 'lesen', 'lest', 'lesen'],
  fahren: ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'],
};
function deForms(entry) {
  const lemma = norm(entry.lemma);
  if (DE_IRREGULAR[lemma]) return DE_IRREGULAR[lemma];
  if (!/動詞/.test(entry.pos) || !/en$/.test(lemma) || /\s/.test(lemma)) return null;
  const stem = lemma.slice(0, -2);
  const dt = /[td]$|[^aeiouäöülr]n$|[^aeiouäöülr]m$/.test(stem); // 語幹が t・d などで終わるときは e を挟む（arbeiten → arbeitest）
  const du = /[sßxz]$/.test(stem) ? `${stem}t` : dt ? `${stem}est` : `${stem}st`;
  const er = dt ? `${stem}et` : `${stem}t`;
  return [`${stem}e`, du, er, lemma, er, lemma];
}
function deInfo(entry, surface) {
  const forms = deForms(entry);
  return forms ? personResult(entry, surface, forms, DE_PERSONS, T6, '現在形のみ。ほかの時制は未対応です') : result([], null);
}

// ロシア語
const RU_PERSONS = ['1人称単数（я）', '2人称単数（ты）', '3人称単数（он／она／оно）', '1人称複数（мы）', '2人称複数（вы）', '3人称複数（они）'];
const RU_IRREGULAR = {
  любить: ['люблю', 'любишь', 'любит', 'любим', 'любите', 'любят'],
  говорить: ['говорю', 'говоришь', 'говорит', 'говорим', 'говорите', 'говорят'],
  хотеть: ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят'],
  идти: ['иду', 'идёшь', 'идёт', 'идём', 'идёте', 'идут'],
};
function ruForms(entry) {
  const lemma = norm(entry.lemma);
  if (RU_IRREGULAR[lemma]) return RU_IRREGULAR[lemma];
  if (!/動詞/.test(entry.pos)) return null;
  if (/[аяе]ть$/.test(lemma)) { const st = lemma.slice(0, -2); return [`${st}ю`, `${st}ешь`, `${st}ет`, `${st}ем`, `${st}ете`, `${st}ют`]; } // читать → читаю, читаешь…
  if (/ить$/.test(lemma)) { const st = lemma.slice(0, -3); return [`${st}ю`, `${st}ишь`, `${st}ит`, `${st}им`, `${st}ите`, `${st}ят`]; }
  return null;
}
function ruInfo(entry, surface) {
  const forms = ruForms(entry);
  return forms ? personResult(entry, surface, forms, RU_PERSONS, T6, '現在形のみ。ほかの時制は未対応です') : result([], null);
}

// アラビア語（辞書にある動詞だけ。母音記号は省略）。2・3人称の単数に男性・女性がある
const AR_PERSONS = ['1人称単数（أنا）', '2人称単数・男性（أنتَ）', '2人称単数・女性（أنتِ）', '3人称単数・男性（هو）', '3人称単数・女性（هي）', '1人称複数（نحن）', '2人称複数・男性（أنتم）', '3人称複数・男性（هم）'];
const AR_TONES = ['p0', 'p1', 'p1', 'p2', 'p2', 'p3', 'p4', 'p5'];
const AR_TABLES = {
  'أحب': ['أحب', 'تحب', 'تحبين', 'يحب', 'تحب', 'نحب', 'تحبون', 'يحبون'],
  'قرأ': ['أقرأ', 'تقرأ', 'تقرئين', 'يقرأ', 'تقرأ', 'نقرأ', 'تقرؤون', 'يقرؤون'],
};
function arInfo(entry, surface) {
  const forms = AR_TABLES[entry.lemma];
  // アラビア語の見出し語は1人称単数の形なので、「不定詞」とは表示しない
  return forms ? personResult(entry, surface, forms, AR_PERSONS, AR_TONES, '現在形のみ。母音記号は省略しています', false) : result([], null);
}

// entry: 辞書エントリ（lemma, pos, conj, forms）, surface: 本文中の表記
// 返り値: { form: ラベルをつなげた文字列|null, formTags: [{label, tone}],
//          table: { title, tenses:[{id, label, rows:[{label, form}], hit:[行番号]}], note? }|null }
export function inflectInfo(lang, entry, surface) {
  const s = norm(surface);
  if (lang === 'en') return enInfo(entry, s);
  if (lang === 'es') return esInfo(entry, s);
  if (lang === 'fr') return frInfo(entry, s);
  if (lang === 'de') return deInfo(entry, s);
  if (lang === 'ru') return ruInfo(entry, s);
  if (lang === 'ar') return arInfo(entry, s);
  return result([], null);
}
