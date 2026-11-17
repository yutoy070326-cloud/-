// 単語のフォルダー分け。
//   ・自動フォルダー … 単語を保存した「文章」ごと（sourceKey = 文章の中身のハッシュ）。
//                      マイ教材に同じ文章があれば、そのタイトルに常に連動する。
//   ・カスタムフォルダー … ユーザーが自分で作る。単語に folderId を付けて所属させる。
//   ・未分類 … どちらにも属さない単語。
// 単語の所属 = folderId（手動で選んだフォルダー）があればそれ、なければ sourceKey、なければ未分類。

export const NONE_KEY = 'none'; // 未分類

export function textKey(text) {
  const t = String(text).trim().replace(/\s+/g, ' ');
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return `t${(h >>> 0).toString(36)}-${t.length}`;
}

export const isCustomKey = (k) => typeof k === 'string' && k.startsWith('c-');

export const folderKeyOf = (w) => w.folderId ?? w.sourceKey ?? NONE_KEY;
export const sourceKeyOf = folderKeyOf; // 旧名（互換）

// 一覧用フォルダー： [{ key, title, count, kind: 'custom'|'source'|'none' }]
// カスタムフォルダーは空でも出す。自動フォルダーは単語があるものだけ。
export function buildFolders(words, materials = [], customFolders = [], books = []) {
  const byKey = new Map(materials.map((m) => [textKey(m.text), m]));
  for (const b of books) byKey.set(b.id, b); // 本の単語は本ごとのフォルダー（題名に連動）
  const counts = new Map();
  const titles = new Map();
  for (const w of words) {
    const key = folderKeyOf(w);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!titles.has(key) && key !== NONE_KEY && !isCustomKey(key)) {
      titles.set(key, (byKey.get(key)?.title) ?? w.sourceTitle ?? '無題の文章');
    }
  }
  const out = customFolders.map((c) => ({ key: c.id, title: c.name, count: counts.get(c.id) ?? 0, kind: 'custom' }));
  const known = new Set(customFolders.map((c) => c.id));
  for (const [key, count] of counts) {
    if (key === NONE_KEY || known.has(key)) continue;
    if (isCustomKey(key)) {
      out.push({ key: NONE_KEY, title: '未分類', count, kind: 'none' }); // 消えたフォルダーの単語は未分類扱い
      continue;
    }
    out.push({ key, title: titles.get(key), count, kind: 'source' });
  }
  const none = counts.get(NONE_KEY);
  if (none && !out.some((f) => f.key === NONE_KEY)) out.push({ key: NONE_KEY, title: '未分類', count: none, kind: 'none' });
  return out;
}

// 移動先フォルダー（編集フォームの選択肢）。全言語の単語から作る
export function moveTargets(words, materials, customFolders, books = []) {
  const fs = buildFolders(words, materials, customFolders, books).filter((f) => f.key !== NONE_KEY);
  return [{ key: NONE_KEY, title: '未分類', kind: 'none' }, ...fs];
}

// 単語をフォルダーに移すときの変更内容
export function folderPatch(folder) {
  if (!folder || folder.key === NONE_KEY) return { folderId: NONE_KEY };
  if (folder.kind === 'custom') return { folderId: folder.key };
  return { folderId: undefined, sourceKey: folder.key, sourceTitle: folder.title };
}

// 絞り込み条件 { lang, source: 'all'|key, fav }
export function matchesFilter(w, f) {
  return (
    (f.lang === 'all' || w.lang === f.lang) &&
    (f.source === 'all' || folderKeyOf(w) === f.source) &&
    (!f.fav || !!w.favorite)
  );
}

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// 出典の記録が無い単語（古い版で保存）を、例文が含まれるマイ教材に自動で結びつける。
// 変更があれば新しい配列を、無ければ null を返す。
export function healSources(words, materials) {
  if (!materials.length) return null;
  const texts = materials.map((m) => ({ key: textKey(m.text), title: m.title, body: norm(m.text) }));
  let changed = false;
  const out = words.map((w) => {
    if (w.sourceKey || w.folderId || w.manual || !w.context) return w;
    const ctx = norm(w.context);
    if (ctx.length < 6) return w;
    const hit = texts.find((t) => t.body.includes(ctx));
    if (!hit) return w;
    changed = true;
    return { ...w, sourceKey: hit.key, sourceTitle: hit.title };
  });
  return changed ? out : null;
}
