import React from 'react';

export const KIND_OPTIONS = [
  { code: 'book', ico: '📖', title: '本', sub: '洋書・外国語の本を1ページずつ' },
  { code: 'article', ico: '📰', title: '記事', sub: 'ニュース・コラムをトピック別に' },
  { code: 'lyrics', ico: '🎵', title: '歌詞', sub: 'アーティストごとに曲を貯める' },
  { code: 'exam', ico: '📝', title: '長文問題', sub: '試験の長文をファイルにまとめる' },
  { code: 'other', ico: '📄', title: 'その他', sub: 'それ以外の文章をファイルに入れる' },
];

// 「＋」を押したときに出る、文章の種類の選択モーダル
export default function KindPicker({ onPick, onClose }) {
  return (
    <div className="sheet-backdrop picker-backdrop" onClick={onClose}>
      <div className="sheet picker-sheet" role="dialog" aria-label="追加する種類を選ぶ" onClick={(e) => e.stopPropagation()}>
        <h3 className="sheet-title">何を追加しますか？</h3>
        <ul className="picker-list">
          {KIND_OPTIONS.map((k) => (
            <li key={k.code}>
              <button className="picker-item" onClick={() => onPick(k.code)} data-testid={`kind-${k.code}`}>
                <span className="picker-ico" aria-hidden="true">{k.ico}</span>
                <span className="picker-text"><b>{k.title}</b><small>{k.sub}</small></span>
                <span className="picker-arrow" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="btn ghost block" onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}
