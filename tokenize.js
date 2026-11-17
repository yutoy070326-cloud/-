// 文章をトークン列に分解する。Intl.Segmenter を使うので、
// 空白区切りの言語（英/西/仏/独…）も、日本語・中国語など空白のない言語も扱える。
//
// token: { i: 通し番号, text, type: 'word' | 'space' | 'punct' | 'break' }

export function tokenize(text, lang = 'en') {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  let segmenter;
  try {
    segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
  } catch {
    segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  }
  const tokens = [];
  for (const s of segmenter.segment(normalized)) {
    const t = s.segment;
    let type;
    if (s.isWordLike) type = 'word';
    else if (t.includes('\n')) type = 'break';
    else if (/^\s+$/.test(t)) type = 'space';
    else type = 'punct';
    tokens.push({ i: tokens.length, text: t, type });
  }
  return tokens;
}

// start〜end（両端含む）のトークンを含む「文」を返す（保存時の例文用）
export function sentenceAround(tokens, start, end) {
  const isEnd = (t) => t.type === 'punct' && /[.!?。！？]/.test(t.text);
  let a = start;
  while (a > 0 && !isEnd(tokens[a - 1]) && tokens[a - 1].type !== 'break') a--;
  let b = end;
  while (b < tokens.length - 1 && !isEnd(tokens[b]) && tokens[b + 1].type !== 'break') b++;
  return tokens
    .slice(a, b + 1)
    .map((t) => t.text)
    .join('')
    .trim();
}
