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
const personTone = (i) => `p${(i % 3) + 1}`;

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
  const triple = enTriple(entry);
  if (!triple) return result([], null);
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
  const rows = forms.map((f, i) => ({ label: ES_PERSONS[i], form: f }));
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
  const rows = forms.map((f, i) => ({ label: FR_PERSONS[i], form: f }));
  const hit = forms.map((f, i) => (norm(f) === surface ? i : -1)).filter((i) => i >= 0);
  let tags = [];
  if (surface === lemma) tags = [{ label: '不定詞（原形）', tone: 'base' }];
  else if (hit.length) tags = [{ label: '直説法現在', tone: 'tense' }, ...hit.map((i) => ({ label: FR_PERSONS[i], tone: personTone(i) }))];
  return result(tags, { id: 'present', label: '直説法現在', rows, hit }, '現在形のみ。ほかの時制は未対応です');
}

// entry: 辞書エントリ（lemma, pos, conj, forms）, surface: 本文中の表記
// 返り値: { form: ラベルをつなげた文字列|null, formTags: [{label, tone}],
//          table: { title, tenses:[{id, label, rows:[{label, form}], hit:[行番号]}], note? }|null }
export function inflectInfo(lang, entry, surface) {
  const s = norm(surface);
  if (lang === 'en') return enInfo(entry, s);
  if (lang === 'es') return esInfo(entry, s);
  if (lang === 'fr') return frInfo(entry, s);
  return result([], null);
}
