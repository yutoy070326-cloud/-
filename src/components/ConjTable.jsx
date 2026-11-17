import React, { useState } from 'react';

// 活用表。何形・何人称のラベルを押すと開く。
// 時制が複数あるときは切り替えボタンが出る（いまは現在形のみ。辞書／AIをつなぐと全時制を渡せる）。
// 本文中で使われている形の行には色がつく。人称ごとの色はラベルと同じ。
export default function ConjTable({ table }) {
  const firstHit = Math.max(0, table.tenses.findIndex((t) => t.hit?.length));
  const [ti, setTi] = useState(firstHit);
  const tense = table.tenses[ti];
  return (
    <div className="wd-block conj" onClick={(e) => e.stopPropagation()} data-testid="conj-table">
      {table.tenses.length > 1 ? (
        <div className="wd-tenses" role="tablist">
          {table.tenses.map((t, i) => (
            <button key={t.id} type="button" role="tab" aria-selected={i === ti} className={'wd-tense' + (i === ti ? ' on' : '')} onClick={() => setTi(i)}>
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="wd-title">活用表（{tense.label}）</div>
      )}
      <table className="wd-table">
        <tbody>
          {tense.rows.map((r, i) => (
            <tr key={i} className={tense.hit?.includes(i) ? 'hit' : ''}>
              <th>
                {r.tone && <span className={'rdot ' + r.tone} aria-hidden="true" />}
                {r.label}
              </th>
              <td>{r.form}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {table.note && <div className="wd-note">{table.note}</div>}
    </div>
  );
}
