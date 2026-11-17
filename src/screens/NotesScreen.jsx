import React, { useMemo } from 'react';
import Hanamaru from '../components/Hanamaru.jsx';
import { loadNotes, loadMedals } from '../lib/diary.js';

// 過去の達成ノート：花丸がついた記録を、日付ごとに振り返る
export default function NotesScreen({ onBack }) {
  const notes = useMemo(loadNotes, []);
  const medals = useMemo(() => Object.fromEntries(loadMedals().map((m) => [m.id, m])), []);
  const groups = [];
  for (const n of notes) {
    const day = new Date(n.at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    let g = groups.find((x) => x.day === day);
    if (!g) groups.push((g = { day, items: [] }));
    g.items.push(n);
  }
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>← 戻る</button>
        <h2 className="title">📓 達成ノート</h2>
        <span className="topbar-spacer" />
      </header>
      <main className="content" data-testid="notes-screen">
        {groups.length === 0 && <p className="empty">まだ達成ノートがありません。<br />ホームの「学習を終える」を押すと、今日の達成が花丸つきで残ります。</p>}
        {groups.map((g) => (
          <section key={g.day} className="note-day">
            <h3 className="note-day-title">{g.day}</h3>
            {g.items.map((n) => (
              <div key={n.id} className="note-card" data-testid="note-card">
                <div className="note-time">{new Date(n.at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                <ul className="notebook-lines static">
                  {n.lines.map((l, i) => (
                    <li key={i} className="note-line shown"><span className="note-text">・{l.text}</span><Hanamaru size={28} /></li>
                  ))}
                </ul>
                {n.medalIds?.length > 0 && (
                  <div className="note-medals">
                    {n.medalIds.map((id) => medals[id] && <span key={id} className="note-medal">{medals[id].emoji} {medals[id].title}</span>)}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
