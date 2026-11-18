// 選んだ言語のキーボードが、端末に入っていそうか。
// ブラウザからは、入っているキーボードの一覧は取れない。代わりに「端末の優先言語の一覧（navigator.languages）」に
// その言語が含まれるかで、目安として判断する（英語は、ほぼ必ず入っているので対象外）。
const ALIASES = { tl: ['tl', 'fil'], zh: ['zh'], id: ['id', 'in'] };

export function keyboardLikelyMissing(lang) {
  if (!lang || lang === 'en') return false;
  try {
    const list = (navigator.languages?.length ? navigator.languages : [navigator.language]).map((l) => String(l).toLowerCase());
    const codes = ALIASES[lang] ?? [lang];
    return !list.some((l) => codes.some((c) => l === c || l.startsWith(`${c}-`)));
  } catch {
    return false;
  }
}
