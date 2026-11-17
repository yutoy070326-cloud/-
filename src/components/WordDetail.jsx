import React, { useState } from 'react';

// 「詳しく見る」：ほかの意味・使い方と、活用表（さらに「活用表」ボタンで開く）。
// 初級者向けには閉じたままにしておく。
export function hasDetail(d) {
  return !!d && ((d.more && d.more.length > 0) || !!d.table);
}

function ConjugationTable({ table }) {
  // 時制が複数あるときは切り替え（今は現在形のみ。時制を足すと自動で切り替えボタンが出る）
  const firstHit = Math.max(0, table.tenses.findIndex((t) => t.hit?.length));
  const [ti, setTi] = useState(firstHit);
  const tense = table.tenses[ti];
  return (
    <div className="wd-block">
      {table.tenses.length > 1 ? (
        <div className="wd-tenses" role="tablist">
          {table.tenses.map((t, i) => (
            <button key={t.id} type="button" role="tab" aria-selected={i === ti} className={'wd-tense' + (i === ti ? ' on' : '')} onClick={() => setTi(i)}>
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="wd-title">{tense.label}</div>
      )}
      <table className="wd-table">
        <tbody>
          {tense.rows.map((r, i) => (
            <tr key={i} className={tense.hit?.includes(i) ? 'hit' : ''}>
              <th>{r.label}</th>
              <td>{r.form}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {table.note && <div className="wd-note">{table.note}</div>}
    </div>
  );
}

// open: 「詳しく見る」を開いているか / always: 「いつも詳しく」設定 / alwaysTable: 活用表を最初から開く設定
export default function WordDetail({ detail, open, always, alwaysTable, onToggle }) {
  const [tableOpen, setTableOpen] = useState(!!alwaysTable);
  if (!hasDetail(detail)) return null;
  const shown = always || open;
  const { table, more } = detail;
  return (
    <div className="wd" onClick={(e) => e.stopPropagation()}>
      {shown && (
        <div className="wd-panel">
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
          {table && (
            <>
              <button type="button" className="wd-btn small" onClick={() => setTableOpen((o) => !o)} data-testid="table-toggle">
                {tableOpen ? '活用表を閉じる ▲' : '活用表を見る ▼'}
              </button>
              {tableOpen && <ConjugationTable table={table} />}
            </>
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
