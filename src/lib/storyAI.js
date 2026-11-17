// ===== モックAI：物語生成 =====
// 本番では generateStory の中身を LLM API 呼び出しに差し替える。
// 入力: { lang, level, genre }  出力: { title, text, lang, level, genre, note? }
//
// 物語は「段落 → [原文, 日本語訳] の文ペア」で持つ。
// 文ペアは translate.js のモック翻訳（全体訳・選択範囲の訳）にも使われる。

export const LANGUAGES = [
  { code: 'en', label: '英語 English' },
  { code: 'es', label: 'スペイン語 Español' },
  { code: 'fr', label: 'フランス語 Français' },
];

// 貼り付け用（辞書は en/es/fr のみモック対応。他言語も分かち書きとハイライトは動く）
export const PASTE_LANGUAGES = [
  ...LANGUAGES,
  { code: 'de', label: 'ドイツ語 Deutsch' },
  { code: 'zh', label: '中国語 中文' },
  { code: 'ko', label: '韓国語 한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'ru', label: 'ロシア語 Русский' },
  { code: 'ar', label: 'アラビア語 العربية' },
];

const LANG_NAMES = {
  en: '英語',
  es: 'スペイン語',
  fr: 'フランス語',
  de: 'ドイツ語',
  zh: '中国語',
  ko: '韓国語',
  ja: '日本語',
  ru: 'ロシア語',
  ar: 'アラビア語',
};
export const langName = (code) => LANG_NAMES[code] ?? String(code).toUpperCase();

export const LEVELS = [
  { code: 'beginner', label: '初級' },
  { code: 'intermediate', label: '中級' },
];

export const GENRES = [
  { code: 'daily', label: '日常ドラマ' },
  { code: 'scifi', label: 'SF' },
];

const STORIES = {
  'en/daily/beginner': {
    title: 'A Rainy Morning',
    paragraphs: [
      [
        ['Emi woke up early on Saturday.', 'エミは土曜日の朝、早く目を覚ました。'],
        ['It was raining, so she decided to stay home.', '雨が降っていたので、彼女は家にいることにした。'],
        ['She made a cup of tea and looked out of the window.', '彼女は紅茶を一杯入れて、窓の外を眺めた。'],
      ],
      [
        ['Her brother Ken came into the kitchen and said, "Let\'s bake some cookies!"', '弟のケンが台所に入ってきて言った。「クッキーを焼こうよ！」'],
        ['Emi smiled.', 'エミはほほえんだ。'],
        ['They mixed flour, sugar, and butter together.', '二人は小麦粉と砂糖とバターを一緒に混ぜた。'],
      ],
      [
        ['While the cookies were baking, the whole house smelled sweet.', 'クッキーが焼けている間、家じゅうが甘い香りに包まれた。'],
        ['In the end, it turned out to be a lovely day.', '結局、素敵な一日になった。'],
      ],
    ],
  },
  'en/daily/intermediate': {
    title: 'The Last Train',
    paragraphs: [
      [
        ['Daniel had been working late again.', 'ダニエルはまた遅くまで仕事をしていた。'],
        ['By the time he left the office, the streets were nearly empty and a thin fog had settled over the city.', '彼が会社を出るころには、通りはほとんど人気がなく、薄い霧が街を覆っていた。'],
        ['He hurried toward the station, hoping to catch the last train.', '彼は終電に間に合うことを願いながら、駅へ急いだ。'],
      ],
      [
        ['As he reached the platform, he realized that he had left his umbrella at the office.', 'ホームに着いたとき、彼は傘を会社に忘れてきたことに気づいた。'],
        ["It couldn't be helped.", '仕方がなかった。'],
        ['A stranger standing nearby offered to share hers, and they ended up talking all the way home.', '近くに立っていた見知らぬ女性が自分の傘に入れてくれると申し出て、二人は帰り道ずっと話し込むことになった。'],
      ],
      [
        ['Daniel never expected that staying late could lead to such an unexpected friendship.', '遅くまで残業したことが、こんな思いがけない友情につながるとは、ダニエルは思ってもみなかった。'],
      ],
    ],
  },
  'en/scifi/beginner': {
    title: 'The Robot on Mars',
    paragraphs: [
      [
        ['In the year 2150, a small robot named Piko lived on Mars.', '2150年、ピコという名前の小さなロボットが火星で暮らしていた。'],
        ['Every day, Piko checked the old machines and cleaned the dust from the solar panels.', '毎日、ピコは古い機械を点検し、ソーラーパネルのほこりを掃除した。'],
      ],
      [
        ['One night, it found a strange light under a rock.', 'ある夜、ピコは岩の下に不思議な光を見つけた。'],
        ['Piko was curious, so it dug a deep hole.', 'ピコは好奇心にかられて、深い穴を掘った。'],
        ['Inside, there was a tiny seed.', '中には小さな種があった。'],
      ],
      [
        ['"A plant on Mars?" Piko said.', '「火星に植物？」とピコは言った。'],
        ['It gave the seed some water and waited.', 'ピコは種に水をやって待った。'],
        ['A few days later, a small leaf came out.', '数日後、小さな葉が顔を出した。'],
      ],
    ],
  },
  'es/daily/beginner': {
    title: 'Un día en el café',
    paragraphs: [
      [
        ['Marta trabaja en un pequeño café en Madrid.', 'マルタはマドリードの小さなカフェで働いている。'],
        ['Todas las mañanas prepara el café y abre la puerta a las ocho.', '毎朝、コーヒーを淹れて、8時にドアを開ける。'],
      ],
      [
        ['Hoy, un chico nuevo entra y pide un té con leche.', '今日、新顔の若者が入ってきて、ミルクティーを注文する。'],
        ['Marta lo mira y sonríe.', 'マルタは彼を見てほほえむ。'],
      ],
      [
        ['—¿Eres de aquí? —pregunta ella.', '「ここの人？」と彼女は尋ねる。'],
        ['—No, acabo de llegar de Japón —responde él.', '「いや、日本から着いたばかりなんだ」と彼は答える。'],
      ],
      [
        ['Marta quiere ayudarlo, así que le habla de su ciudad favorita.', 'マルタは彼を助けたくて、お気に入りの街のことを話してあげる。'],
      ],
    ],
  },
  'es/scifi/beginner': {
    title: 'La nave perdida',
    paragraphs: [
      [
        ['El año es 2300.', '年は2300年。'],
        ['La capitán Lucía despierta en su nave y no recuerda nada.', '艦長のルシアは自分の船の中で目を覚ますが、何も思い出せない。'],
        ['Las luces parpadean y el ordenador repite un mensaje extraño: «La Tierra ya no existe».', '明かりが点滅し、コンピューターが奇妙なメッセージを繰り返す。「地球はもう存在しない」。'],
      ],
      [
        ['Lucía se levanta con dificultad y camina hacia el puente de mando.', 'ルシアは苦労して起き上がり、艦橋に向かって歩く。'],
        ['Allí encuentra una puerta abierta y una voz desconocida que dice: «Te estábamos esperando».', 'そこで開いたドアと、知らない声に出会う。声は言う。「君を待っていたよ」。'],
      ],
    ],
  },
  'fr/daily/beginner': {
    title: 'Le marché du dimanche',
    paragraphs: [
      [
        ['Chaque dimanche, Claire va au marché avec sa grand-mère.', '毎週日曜日、クレールは祖母と市場へ行く。'],
        ['Elles achètent des pommes, du pain et du fromage.', '二人はりんごとパンとチーズを買う。'],
      ],
      [
        ["Le vendeur sourit et dit : « Bonjour, mesdames ! Il fait beau aujourd'hui. »", '店員はほほえんで言う。「こんにちは、お嬢さんたち！今日はいい天気ですね」'],
        ['Claire adore cette ambiance.', 'クレールはこの雰囲気が大好きだ。'],
      ],
      [
        ['Après le marché, elles rentrent à la maison et préparent le déjeuner ensemble.', '市場の後、二人は家に帰って、一緒に昼食を作る。'],
      ],
    ],
  },
};

// 「サンプルを入れる」用（貼り付けモードで動作確認できるよう、訳も用意）
const SAMPLE_PAIRS_EN = [
  ["I didn't expect to like the small town, but it turned out to be a lovely place.", 'その小さな町を好きになるとは思っていなかったが、結局、素敵な場所だった。'],
  ['Every morning, I walked to the station and looked out of the window of the train.', '毎朝、私は駅まで歩き、電車の窓から外を眺めた。'],
];
export const SAMPLE_PASTE = {
  en: SAMPLE_PAIRS_EN.map((p) => p[0]).join(' '),
};

// ---- モック翻訳用コーパス（lang, src, ja の平坦リスト）----
export const CORPUS = [
  ...Object.entries(STORIES).flatMap(([key, story]) =>
    story.paragraphs.flat().map(([src, ja]) => ({ lang: key.split('/')[0], src, ja })),
  ),
  ...SAMPLE_PAIRS_EN.map(([src, ja]) => ({ lang: 'en', src, ja })),
];

const buildText = (story) =>
  story.paragraphs.map((p) => p.map((s) => s[0]).join(' ')).join('\n\n');

// ---- 単語帳の単語から作る物語（モック）----
// 単語帳からランダムに選んだ単語を、テンプレートの文に入れて物語にする。本番では LLM に単語リストを渡して作らせる。
// 文ごとの日本語訳も CORPUS に登録するので、翻訳表示もできる。
const WORD_TEMPLATES = {
  en: {
    title: 'Words in My Notebook',
    intro: ['One quiet evening, Mia opened her notebook and found the word "{w}".', 'ある静かな夜、ミアはノートを開いて、「{w}」という言葉を見つけた。'],
    mid: [
      ['It reminded her of "{w}", another word she had learned.', 'それは、前に覚えた「{w}」という言葉を思い出させた。'],
      ['She wrote a short story that used "{w}".', '彼女は「{w}」を使った短い物語を書いた。'],
      ['The next day, "{w}" appeared again in a song.', '次の日、「{w}」がまた歌の中に出てきた。'],
    ],
    end: ['Little by little, her new words became friends.', '少しずつ、新しい言葉は友達になっていった。'],
  },
  es: {
    title: 'Palabras en mi cuaderno',
    intro: ['Una tarde tranquila, Mía abrió su cuaderno y encontró la palabra "{w}".', 'ある静かな午後、ミアはノートを開いて、「{w}」という言葉を見つけた。'],
    mid: [
      ['Le recordó "{w}", otra palabra que había aprendido.', 'それは、前に覚えた「{w}」という言葉を思い出させた。'],
      ['Escribió una historia corta con "{w}".', '彼女は「{w}」を使った短い物語を書いた。'],
      ['Al día siguiente, "{w}" apareció otra vez en una canción.', '次の日、「{w}」がまた歌の中に出てきた。'],
    ],
    end: ['Poco a poco, sus palabras nuevas se hicieron amigas.', '少しずつ、新しい言葉は友達になっていった。'],
  },
  fr: {
    title: 'Les mots de mon cahier',
    intro: ['Un soir tranquille, Léa ouvrit son cahier et trouva le mot « {w} ».', 'ある静かな夜、レアはノートを開いて、「{w}」という言葉を見つけた。'],
    mid: [
      ['Cela lui rappela « {w} », un autre mot qu\'elle avait appris.', 'それは、前に覚えた「{w}」という言葉を思い出させた。'],
      ['Elle écrivit une courte histoire avec « {w} ».', '彼女は「{w}」を使った短い物語を書いた。'],
      ['Le lendemain, « {w} » revint dans une chanson.', '次の日、「{w}」がまた歌の中に出てきた。'],
    ],
    end: ['Petit à petit, ses nouveaux mots devinrent des amis.', '少しずつ、新しい言葉は友達になっていった。'],
  },
};

// words: [{ lemma, meaning }]。返り値は generateStory と同じ形（note に使った単語を載せる）
export async function generateStoryFromWords({ lang, level = 'beginner', words }) {
  await new Promise((r) => setTimeout(r, 900));
  const tpl = WORD_TEMPLATES[lang] ?? WORD_TEMPLATES.en;
  const useLang = WORD_TEMPLATES[lang] ? lang : 'en';
  const pairs = [];
  const fill = (pair, w) => [pair[0].replace('{w}', w), pair[1].replace('{w}', w)];
  words.forEach((w, i) => pairs.push(fill(i === 0 ? tpl.intro : tpl.mid[(i - 1) % tpl.mid.length], w.lemma)));
  pairs.push(tpl.end);
  // 3文ごとに段落を分ける
  const paragraphs = [];
  for (let i = 0; i < pairs.length; i += 3) paragraphs.push(pairs.slice(i, i + 3));
  for (const [src, ja] of pairs) CORPUS.push({ lang: useLang, src, ja }); // 翻訳表示のために登録
  return {
    title: tpl.title,
    text: paragraphs.map((p) => p.map((x) => x[0]).join(' ')).join('\n\n'),
    lang: useLang,
    genre: 'words',
    level,
    words: words.map((w) => w.lemma),
    note: `単語帳の${words.length}個の単語から作りました：${words.map((w) => w.lemma).join('、')}`,
  };
}

export async function generateStory({ lang, level, genre }) {
  await new Promise((r) => setTimeout(r, 900)); // AI生成っぽい待ち時間

  let key = `${lang}/${genre}/${level}`;
  let note;
  if (!STORIES[key]) {
    // モック用フォールバック：同じ言語で近いものを探す
    const keys = Object.keys(STORIES).filter((k) => k.startsWith(`${lang}/`));
    key = keys.find((k) => k.startsWith(`${lang}/${genre}/`)) ?? keys[0] ?? 'en/daily/beginner';
    note = 'モック版のため、指定条件に近い既存の物語を表示しています。';
  }
  const [l, g, lv] = key.split('/');
  const story = STORIES[key];
  return { title: story.title, text: buildText(story), lang: l, genre: g, level: lv, note };
}
