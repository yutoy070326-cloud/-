import React from 'react';

// 「詳しく見る」：ほかの意味・使い方（より詳しい情報）。初級者向けには閉じたままにしておく。
// 活用表はここではなく、何形・何人称のラベルを押して開く（FormTags / ConjTable）。
export function hasDetail(d) {
  return !!d && !!d.more && d.more.length > 0;
}

// open: 「詳しく見る」を開いているか / always: 「いつも詳しく」設定
export default function WordDetail({ detail, open, always, onToggle }) {
  if (!hasDetail(detail)) return null;
  const shown = always || open;
  return (
    <div className="wd" onClick={(e) => e.stopPropagation()}>
      {shown && (
        <div className="wd-panel">
          <div className="wd-block">
            <div className="wd-title">ほかの意味・使い方</div>
            {detail.more.map((m, i) => (
              <div key={i} className="wd-item">
                <div className="wd-meaning">{m.meaning}</div>
                {m.usage && <div className="wd-usage">{m.usage}</div>}
                {m.example && <div className="wd-ex">{m.example}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {!always && (
        <button type="button" className="wd-btn" onClick={onToggle} data-testid="detail-toggle">
          {open ? '閉じる ▲' : '詳しく見る ▼'}
        </button>
      )}
    </div>
  );
}
