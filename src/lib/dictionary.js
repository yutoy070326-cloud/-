import { inflectInfo } from './inflect.js';

// ===== モック辞書 =====
// 本番ではここを AI / 辞書API 呼び出しに差し替える（lookupWord のシグネチャはそのまま）。
// 各エントリ: [表層形（|区切り。活用形・熟語を含む）, 原形, 品詞, 意味, 活用]

const RAW = {
  en: [
    ['woke up|wake up|wakes up|waking up|woken up', 'wake up', '句動詞', '目を覚ます、起きる', 'wake up – woke up – woken up'],
    ['early', 'early', '副詞/形容詞', '早く、早い', ''],
    ['raining|rained|rains|rain', 'rain', '動詞/名詞', '雨が降る；雨', 'rain – rained – rained'],
    ['decided|decide|decides|deciding', 'decide', '動詞', '決める、決心する', 'decide – decided – decided'],
    ['stay|stayed|stays|staying', 'stay', '動詞', 'とどまる、滞在する', 'stay – stayed – stayed'],
    ['home', 'home', '名詞/副詞', '家；家に', ''],
    ['made|make|makes|making', 'make', '動詞', '作る、〜させる', 'make – made – made'],
    ['cup', 'cup', '名詞', 'カップ、茶碗', ''],
    ['tea', 'tea', '名詞', 'お茶', ''],
    ['looked out of|look out of|looks out of|looking out of', 'look out of', '句動詞', '〜から外を見る', 'look – looked – looked'],
    ['window', 'window', '名詞', '窓', ''],
    ['brother', 'brother', '名詞', '兄、弟', ''],
    ['kitchen', 'kitchen', '名詞', '台所', ''],
    ['said|say|says|saying', 'say', '動詞', '言う', 'say – said – said'],
    ["let's|let us", "let's", '表現', '〜しよう（提案）', "Let's + 動詞の原形"],
    ['bake|baked|bakes|baking', 'bake', '動詞', '（オーブンで）焼く', 'bake – baked – baked'],
    ['cookies|cookie', 'cookie', '名詞', 'クッキー', '複数形: cookies'],
    ['smiled|smile|smiles|smiling', 'smile', '動詞/名詞', 'ほほえむ；笑顔', 'smile – smiled – smiled'],
    ['mixed|mix|mixes|mixing', 'mix', '動詞', '混ぜる', 'mix – mixed – mixed'],
    ['flour', 'flour', '名詞', '小麦粉', ''],
    ['sugar', 'sugar', '名詞', '砂糖', ''],
    ['butter', 'butter', '名詞', 'バター', ''],
    ['together', 'together', '副詞', '一緒に', ''],
    ['while', 'while', '接続詞', '〜している間に', ''],
    ['whole', 'whole', '形容詞', '全体の、まるごとの', ''],
    ['smelled|smell|smells|smelling', 'smell', '動詞', 'においがする、においをかぐ', 'smell – smelled – smelled'],
    ['sweet', 'sweet', '形容詞', '甘い', ''],
    ['in the end', 'in the end', '表現', '結局、最終的に', ''],
    ['turned out to be|turn out to be|turns out to be|turning out to be', 'turn out to be', '句動詞', '結局〜だとわかる、〜になる', 'turn – turned – turned'],
    ['lovely', 'lovely', '形容詞', '素敵な、すばらしい', ''],

    ['working|worked|work|works', 'work', '動詞/名詞', '働く；仕事', 'work – worked – worked'],
    ['late', 'late', '副詞/形容詞', '遅く、遅い', ''],
    ['again', 'again', '副詞', 'また、再び', ''],
    ['by the time', 'by the time', '表現', '〜するまでには', ''],
    ['left|leave|leaves|leaving', 'leave', '動詞', '去る、出る；置いていく', 'leave – left – left'],
    ['office', 'office', '名詞', '事務所、会社', ''],
    ['streets|street', 'street', '名詞', '通り', ''],
    ['nearly', 'nearly', '副詞', 'ほとんど', ''],
    ['empty', 'empty', '形容詞', '空っぽの、人気のない', ''],
    ['thin', 'thin', '形容詞', '薄い、細い', ''],
    ['fog', 'fog', '名詞', '霧', ''],
    ['settled|settle|settles|settling', 'settle', '動詞', '落ち着く、（霧などが）立ち込める', 'settle – settled – settled'],
    ['city', 'city', '名詞', '都市、街', ''],
    ['hurried|hurry|hurries|hurrying', 'hurry', '動詞', '急ぐ', 'hurry – hurried – hurried'],
    ['toward|towards', 'toward', '前置詞', '〜に向かって', ''],
    ['station', 'station', '名詞', '駅', ''],
    ['hoping|hoped|hope|hopes', 'hope', '動詞', '望む、期待する', 'hope – hoped – hoped'],
    ['catch|caught|catches|catching', 'catch', '動詞', '捕まえる；（乗り物に）間に合う', 'catch – caught – caught'],
    ['reached|reach|reaches|reaching', 'reach', '動詞', '到着する、届く', 'reach – reached – reached'],
    ['platform', 'platform', '名詞', 'プラットホーム', ''],
    ['realized|realize|realised|realise|realizes', 'realize', '動詞', '気づく、悟る', 'realize – realized – realized'],
    ['umbrella', 'umbrella', '名詞', '傘', ''],
    ["couldn't be helped|can't be helped", "can't be helped", '表現', '仕方がない', ''],
    ['stranger', 'stranger', '名詞', '見知らぬ人', ''],
    ['nearby', 'nearby', '副詞/形容詞', '近くに、近くの', ''],
    ['offered|offer|offers|offering', 'offer', '動詞', '申し出る、提供する', 'offer – offered – offered'],
    ['share|shared|shares|sharing', 'share', '動詞', '共有する、分け合う', 'share – shared – shared'],
    ['ended up|end up|ends up|ending up', 'end up', '句動詞', '結局〜することになる', 'end – ended – ended'],
    ['all the way', 'all the way', '表現', '道中ずっと、はるばる', ''],
    ['expected|expect|expects|expecting', 'expect', '動詞', '予想する、期待する', 'expect – expected – expected'],
    ['lead to|leads to|led to|leading to', 'lead to', '句動詞', '〜につながる', 'lead – led – led'],
    ['unexpected', 'unexpected', '形容詞', '予期しない', ''],
    ['friendship', 'friendship', '名詞', '友情', ''],

    ['year', 'year', '名詞', '年', ''],
    ['robot', 'robot', '名詞', 'ロボット', ''],
    ['named|name|names', 'name', '動詞/名詞', '名付ける；名前', 'name – named – named'],
    ['lived|live|lives|living', 'live', '動詞', '住む、生きる', 'live – lived – lived'],
    ['mars', 'Mars', '名詞', '火星', ''],
    ['every day', 'every day', '表現', '毎日', ''],
    ['checked|check|checks|checking', 'check', '動詞', '点検する、確認する', 'check – checked – checked'],
    ['old', 'old', '形容詞', '古い、年老いた', ''],
    ['machines|machine', 'machine', '名詞', '機械', ''],
    ['cleaned|clean|cleans|cleaning', 'clean', '動詞', '掃除する', 'clean – cleaned – cleaned'],
    ['dust', 'dust', '名詞', 'ほこり、塵', ''],
    ['solar panels|solar panel', 'solar panel', '名詞', 'ソーラーパネル', ''],
    ['found|find|finds|finding', 'find', '動詞', '見つける', 'find – found – found'],
    ['strange', 'strange', '形容詞', '奇妙な', ''],
    ['light', 'light', '名詞', '光', ''],
    ['rock', 'rock', '名詞', '岩', ''],
    ['curious', 'curious', '形容詞', '好奇心の強い', ''],
    ['dug|dig|digs|digging', 'dig', '動詞', '掘る', 'dig – dug – dug'],
    ['deep', 'deep', '形容詞', '深い', ''],
    ['hole', 'hole', '名詞', '穴', ''],
    ['inside', 'inside', '副詞/前置詞', '中に、〜の中で', ''],
    ['tiny', 'tiny', '形容詞', 'とても小さい', ''],
    ['seed', 'seed', '名詞', '種', ''],
    ['plant', 'plant', '名詞/動詞', '植物；植える', ''],
    ['gave|give|gives|giving|given', 'give', '動詞', '与える', 'give – gave – given'],
    ['water', 'water', '名詞', '水', ''],
    ['waited|wait|waits|waiting', 'wait', '動詞', '待つ', 'wait – waited – waited'],
    ['a few days later', 'a few days later', '表現', '数日後', ''],
    ['leaf', 'leaf', '名詞', '葉', '複数形: leaves'],
    ['came out|come out|comes out|coming out', 'come out', '句動詞', '出てくる、現れる', 'come – came – come'],
  ],

  es: [
    ['trabaja|trabajo|trabajas|trabajamos|trabajan|trabajar', 'trabajar', '動詞', '働く', '現在: trabajo / trabajas / trabaja / trabajamos / trabajan'],
    ['pequeño|pequeña|pequeños|pequeñas', 'pequeño', '形容詞', '小さい', '性数変化: pequeño / pequeña / pequeños / pequeñas'],
    ['café|cafés', 'café', '名詞', 'コーヒー、喫茶店', ''],
    ['todas las mañanas', 'todas las mañanas', '表現', '毎朝', ''],
    ['prepara|preparo|preparas|preparamos|preparan|preparar', 'preparar', '動詞', '準備する、作る', '現在: preparo / preparas / prepara / preparamos / preparan'],
    ['abre|abro|abres|abrimos|abren|abrir', 'abrir', '動詞', '開ける', '現在: abro / abres / abre / abrimos / abren'],
    ['puerta', 'puerta', '名詞（女性）', 'ドア、扉', ''],
    ['ocho', 'ocho', '数詞', '8', ''],
    ['hoy', 'hoy', '副詞', '今日', ''],
    ['chico|chica|chicos|chicas', 'chico', '名詞', '男の子、若者', '女性形: chica'],
    ['nuevo|nueva|nuevos|nuevas', 'nuevo', '形容詞', '新しい', ''],
    ['entra|entro|entras|entramos|entran|entrar', 'entrar', '動詞', '入る', '現在: entro / entras / entra / entramos / entran'],
    ['pide|pido|pides|pedimos|piden|pedir', 'pedir', '動詞', '注文する、頼む', '現在（語幹母音変化 e→i）: pido / pides / pide / pedimos / piden'],
    ['té', 'té', '名詞（男性）', 'お茶', ''],
    ['leche', 'leche', '名詞（女性）', '牛乳', ''],
    ['mira|miro|miras|miramos|miran|mirar', 'mirar', '動詞', '見る', '現在: miro / miras / mira / miramos / miran'],
    ['sonríe|sonrío|sonríes|sonreímos|sonríen|sonreír', 'sonreír', '動詞', 'ほほえむ', '現在: sonrío / sonríes / sonríe / sonreímos / sonríen'],
    ['eres|soy|es|somos|son|ser', 'ser', '動詞', '〜である', '現在: soy / eres / es / somos / son'],
    ['aquí', 'aquí', '副詞', 'ここ', ''],
    ['pregunta|pregunto|preguntas|preguntamos|preguntan|preguntar', 'preguntar', '動詞', '質問する、尋ねる', '現在: pregunto / preguntas / pregunta ...'],
    ['acabo de|acabas de|acaba de|acabamos de|acaban de', 'acabar de + 不定詞', '表現', '〜したばかりだ', 'acabar の現在形 + de + 不定詞'],
    ['llegar', 'llegar', '動詞', '到着する', '現在: llego / llegas / llega / llegamos / llegan'],
    ['japón', 'Japón', '名詞', '日本', ''],
    ['responde|respondo|respondes|respondemos|responden|responder', 'responder', '動詞', '答える', '現在: respondo / respondes / responde ...'],
    ['quiere|quiero|quieres|queremos|quieren|querer', 'querer', '動詞', '〜したい、好きだ', '現在（語幹母音変化 e→ie）: quiero / quieres / quiere / queremos / quieren'],
    ['ayudarlo|ayudarla|ayudar', 'ayudar', '動詞', '助ける、手伝う', 'ayudar + lo（彼を）= ayudarlo'],
    ['así que', 'así que', '表現', 'だから、それで', ''],
    ['habla|hablo|hablas|hablamos|hablan|hablar', 'hablar', '動詞', '話す', '現在: hablo / hablas / habla / hablamos / hablan'],
    ['ciudad', 'ciudad', '名詞（女性）', '都市、街', ''],
    ['favorita|favorito', 'favorito', '形容詞', 'お気に入りの', ''],

    ['año|años', 'año', '名詞（男性）', '年', ''],
    ['capitán|capitana', 'capitán', '名詞', '船長、艦長', ''],
    ['despierta|despierto|despiertas|despertar', 'despertar', '動詞', '目を覚ます；起こす', '現在（e→ie）: despierto / despiertas / despierta ...'],
    ['nave', 'nave', '名詞（女性）', '宇宙船、船', ''],
    ['recuerda|recuerdo|recuerdas|recordar', 'recordar', '動詞', '思い出す、覚えている', '現在（o→ue）: recuerdo / recuerdas / recuerda ...'],
    ['nada', 'nada', '代名詞', '何も〜ない', 'no + 動詞 + nada'],
    ['luces|luz', 'luz', '名詞（女性）', '光、明かり', '複数形: luces'],
    ['parpadean|parpadea|parpadear', 'parpadear', '動詞', 'またたく、点滅する', ''],
    ['ordenador', 'ordenador', '名詞（男性）', 'コンピューター（スペイン語圏の一部）', ''],
    ['repite|repito|repites|repiten|repetir', 'repetir', '動詞', '繰り返す', '現在（e→i）: repito / repites / repite ...'],
    ['mensaje', 'mensaje', '名詞（男性）', 'メッセージ', ''],
    ['extraño|extraña', 'extraño', '形容詞', '奇妙な', ''],
    ['tierra', 'Tierra', '名詞（女性）', '地球；土地', ''],
    ['ya no', 'ya no', '表現', 'もう〜ない', ''],
    ['existe|existo|existes|existen|existir', 'existir', '動詞', '存在する', '現在: existe / existen'],
    ['se levanta|se levantan|me levanto|te levantas', 'levantarse', '再帰動詞', '起き上がる、立ち上がる', '現在: me levanto / te levantas / se levanta ...'],
    ['con dificultad', 'con dificultad', '表現', '苦労して', ''],
    ['camina|camino|caminas|caminan|caminar', 'caminar', '動詞', '歩く', '現在: camino / caminas / camina ...'],
    ['hacia', 'hacia', '前置詞', '〜の方へ', ''],
    ['puente de mando', 'puente de mando', '名詞句', '艦橋、ブリッジ', ''],
    ['allí', 'allí', '副詞', 'そこに', ''],
    ['encuentra|encuentro|encuentras|encuentran|encontrar', 'encontrar', '動詞', '見つける', '現在（o→ue）: encuentro / encuentras / encuentra ...'],
    ['abierta|abierto', 'abierto', '形容詞', '開いている', 'abrir の過去分詞'],
    ['voz', 'voz', '名詞（女性）', '声', '複数形: voces'],
    ['desconocida|desconocido', 'desconocido', '形容詞', '知らない、未知の', ''],
    ['dice|digo|dices|decimos|dicen|decir', 'decir', '動詞', '言う', '現在: digo / dices / dice / decimos / dicen'],
    ['esperando|espera|esperar', 'esperar', '動詞', '待つ、期待する', '現在分詞: esperando'],
  ],

  fr: [
    ['chaque', 'chaque', '形容詞', '毎〜、それぞれの', ''],
    ['dimanche', 'dimanche', '名詞（男性）', '日曜日', ''],
    ['va|vais|vas|allons|allez|vont|aller', 'aller', '動詞', '行く', '現在: vais / vas / va / allons / allez / vont'],
    ['marché', 'marché', '名詞（男性）', '市場', ''],
    ['avec', 'avec', '前置詞', '〜と一緒に', ''],
    ['grand-mère', 'grand-mère', '名詞（女性）', '祖母', ''],
    ['achètent|achète|achètes|achetons|achetez|acheter', 'acheter', '動詞', '買う', '現在: j\'achète / tu achètes / il achète / nous achetons / ils achètent'],
    ['pommes|pomme', 'pomme', '名詞（女性）', 'りんご', ''],
    ['pain', 'pain', '名詞（男性）', 'パン', ''],
    ['fromage', 'fromage', '名詞（男性）', 'チーズ', ''],
    ['vendeur|vendeuse', 'vendeur', '名詞', '店員、売り手', '女性形: vendeuse'],
    ['sourit|souris|sourient|sourire', 'sourire', '動詞', 'ほほえむ', '現在: je souris / il sourit / ils sourient'],
    ['dit|dis|disent|dire', 'dire', '動詞', '言う', '現在: je dis / il dit / ils disent'],
    ['il fait beau', 'il fait beau', '表現', '天気がいい', ''],
    ["aujourd'hui|aujourd’hui", "aujourd'hui", '副詞', '今日', ''],
    ['adore|adorer|adorent', 'adorer', '動詞', '大好きだ', '現在: j\'adore / il adore'],
    ['ambiance', 'ambiance', '名詞（女性）', '雰囲気', ''],
    ['après', 'après', '前置詞', '〜の後で', ''],
    ['rentrent|rentre|rentrer', 'rentrer', '動詞', '帰る', '現在: je rentre / il rentre / ils rentrent'],
    ['maison', 'maison', '名詞（女性）', '家', ''],
    ['préparent|prépare|préparer', 'préparer', '動詞', '準備する、作る', '現在: je prépare / il prépare / ils préparent'],
    ['déjeuner', 'déjeuner', '名詞（男性）/動詞', '昼食；昼食をとる', ''],
    ['ensemble', 'ensemble', '副詞', '一緒に', ''],
  ],
};


// ---- 詳細（他の意味・用法）----
// 初級者には出さず、ポップアップの「詳しく見る」を開いた人だけに見せる。
// キーは「言語:原形」。本番の辞書APIでは複数の語義が返ってくる部分に当たる。
// 各項目: { meaning: 別の意味, usage: 用法のヒント, example: 例文 }
const EXTRA = {
  'en:make': [
    { meaning: '（お金を）稼ぐ', usage: 'make money / make a living', example: 'She makes a good living as a designer.' },
    { meaning: '〜させる（使役）', usage: 'make + 人 + 動詞の原形', example: 'The movie made me cry.' },
  ],
  'en:catch': [
    { meaning: '（病気に）かかる', usage: 'catch a cold', example: 'I caught a cold last week.' },
    { meaning: '聞き取る、理解する', usage: 'I didn\'t catch that.', example: 'Sorry, I didn\'t catch your name.' },
  ],
  'en:leave': [
    { meaning: '〜のままにしておく', usage: 'leave + 目的語 + 状態', example: 'Please leave the door open.' },
    { meaning: '休暇', usage: '名詞: on leave', example: 'He is on leave until Monday.' },
  ],
  'en:work': [
    { meaning: '（機械・方法が）うまくいく、動く', usage: 'It works. / That didn\'t work.', example: 'The new plan really works.' },
    { meaning: '作品', usage: '名詞: a work of art', example: 'This is his best work.' },
  ],
  'en:settle': [
    { meaning: '解決する、決着をつける', usage: 'settle a problem', example: 'They settled the dispute quickly.' },
    { meaning: '定住する', usage: 'settle in + 場所', example: 'She settled in Kyoto.' },
  ],
  'en:check': [
    { meaning: '小切手；（レストランの）勘定書', usage: '名詞: Check, please.', example: 'Could we have the check, please?' },
  ],
  'en:stay': [
    { meaning: '〜のままでいる', usage: 'stay + 形容詞', example: 'Stay calm.' },
  ],
  'en:share': [
    { meaning: '分け前、割り当て；シェア', usage: '名詞: a share of the profit', example: 'Everyone gets an equal share.' },
  ],
};

// ---- インデックス作成 ----
const INDEX = {}; // lang -> Map(normalizedForm -> entry)
const MAX_PHRASE_WORDS = {};

export function normalizeKey(s) {
  return s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

for (const [lang, rows] of Object.entries(RAW)) {
  const map = new Map();
  let maxWords = 1;
  for (const [forms, lemma, pos, meaning, conj] of rows) {
    const entry = {
      lemma, pos, meaning, conj,
      forms: forms.split('|'), // 活用形の一覧（何形かの判定に使う）
      more: EXTRA[`${lang}:${lemma}`] ?? [],
    };
    for (const f of forms.split('|')) {
      const key = normalizeKey(f);
      if (!map.has(key)) map.set(key, entry);
      maxWords = Math.max(maxWords, key.split(' ').length);
    }
  }
  INDEX[lang] = map;
  MAX_PHRASE_WORDS[lang] = maxWords;
}

export function hasEntry(lang, text) {
  return INDEX[lang]?.has(normalizeKey(text)) ?? false;
}

// タップされた単語 idx を含む「熟語・表現」を、辞書にある最長一致で探す。
// なければ単語1つ分の範囲を返す。
export function findRange(tokens, idx, lang) {
  const wordIdx = [];
  tokens.forEach((t) => t.type === 'word' && wordIdx.push(t.i));
  const pos = wordIdx.indexOf(idx);
  if (pos < 0) return { start: idx, end: idx };

  const maxN = Math.min(MAX_PHRASE_WORDS[lang] ?? 1, 5);
  for (let n = maxN; n >= 2; n--) {
    for (let k = pos - n + 1; k <= pos; k++) {
      if (k < 0 || k + n > wordIdx.length) continue;
      const start = wordIdx[k];
      const end = wordIdx[k + n - 1];
      // 単語の間が空白だけであること（句読点・改行をまたがない）
      let ok = true;
      for (let j = start + 1; j < end; j++) {
        if (tokens[j].type !== 'word' && tokens[j].type !== 'space') {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const text = tokens.slice(start, end + 1).map((t) => t.text).join('');
      if (hasEntry(lang, text)) return { start, end };
    }
  }
  return { start: idx, end: idx };
}

// ---- 検索 API（本番では AI/辞書API に差し替える部分）----
// 返り値: { text, lemma, pos, meaning, conj, found }
export async function lookupWord(text, lang, context = '') {
  await new Promise((r) => setTimeout(r, 150)); // 通信っぽい遅延
  const hit = INDEX[lang]?.get(normalizeKey(text));
  if (hit) return { text, ...hit, ...inflectInfo(lang, hit, text), found: true };
  return {
    text,
    lemma: text,
    pos: '—',
    meaning: '（モック辞書に未登録）',
    conj: '',
    more: [],
    form: null,
    table: null,
    found: false,
    context,
  };
}

// 辞書にある語の詳細（何形か・活用表・ほかの意味）を同期で返す。単語テストで使う。
// 見つからなければ null。
export function getDetail(lang, text) {
  const hit = INDEX[lang]?.get(normalizeKey(text));
  if (!hit) return null;
  return { more: hit.more, ...inflectInfo(lang, hit, text) };
}
