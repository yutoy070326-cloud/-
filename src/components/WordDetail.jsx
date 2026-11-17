import React from 'react';

// 「詳しく見る」：活用表と、ほかの意味・使い方。初級者向けには閉じたままにしておく。
// open: 開いているか / always: 「いつも詳しく表示」設定 / onToggle: ボタン押下
export function hasDetail(d) {
  return !!d && ((d.more && d.more.length > 0) || !!d.table);
}

export default function WordDetail({ detail, open, always, onToggle }) {
  if (!hasDetail(detail)) return null;
  const shown = always || open;
  const { table, more } = detail;
  return (
    <div className="wd" onClick={(e) => e.stopPropagation()}>
      {shown && (
        <div className="wd-panel">
          {table && (
            <div className="wd-block">
              <div className="wd-title">{table.title}</div>
              <table className="wd-table">
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={i} className={table.hit?.includes(i) ? 'hit' : ''}>
                      <th>{r.label}</th>
                      <td>{r.form}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.note && <div className="wd-note">{table.note}</div>}
            </div>
          )}
          {more && more.length > 0 && (
            <div className="wd-block">
              <div className="wd-title">ほかの意味・使い方</div>
              {more.map((m, i) => (
                <div key={i} className="wd-item">
                  <div className="wd-meaning">{m.meaning}</div>
                  {m.usage && <div className="wd-usage">{m.usage}</div>}
                  {m.example && <div className="wd-ex">{m.example}</div>}
                </div>
              ))}
            </div>
          )}
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
