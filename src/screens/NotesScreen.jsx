import React, { useMemo, useState } from 'react';
import Hanamaru from '../components/Hanamaru.jsx';
import { loadNotes, loadMedals, medalName, totalsOf } from '../lib/diary.js';
import { dayStr } from '../lib/studyLog.js';
import { t, uiLocale } from '../lib/i18n.js';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';

// 達成ノート：カレンダーで日付を押すと、その日に達成したことが見られる
export default function NotesScreen({ onBack }) {
  const tut = useScreenTutorial('notes');
  const notes = useMemo(loadNotes, []);
  const medals = useMemo(() => Object.fromEntries(loadMedals().map((m) => [m.id, m])), []);
  const byDay = useMemo(() => {
    const m = {};
    for (const n of notes) (m[dayStr(n.at)] ??= []).push(n);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.at - b.at);
    return m;
  }, [notes]);
  const today = dayStr();
  const [sel, setSel] = useState(today);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const y = month.getFullYear();
  const mo = month.getMonth();
  const first = new Date(y, mo, 1).getDay(); // 月初の曜日
  const days = new Date(y, mo + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (d) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(uiLocale(), { weekday: 'short' }));
  const shift = (n) => setMonth(new Date(y, mo + n, 1));
  const dayNotes = byDay[sel] ?? [];
  const dayTotals = totalsOf(dayNotes);
  const allTotals = totalsOf(notes);
  const fmtMin = (m) => (m >= 60 ? t('time.hm', '{h}時間{m}分', { h: Math.floor(m / 60), m: m % 60 }) : t('time.m', '{m}分', { m }));
  const selDate = new Date(`${sel}T00:00:00`);

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>{t('common.back', '← 戻る')}</button>
        <h2 className="title">{t('notes.title', '📓 達成ノート')}</h2>
        <HelpButton onClick={tut.show} />
      </header>
      <main className="content" data-testid="notes-screen">
        <div className="cal" data-testid="calendar">
          <div className="cal-head">
            <button className="btn ghost" onClick={() => shift(-1)} aria-label={t('notes.prev', '前の月')} data-testid="cal-prev">‹</button>
            <b>{month.toLocaleDateString(uiLocale(), { year: 'numeric', month: 'long' })}</b>
            <button className="btn ghost" onClick={() => shift(1)} aria-label={t('notes.next', '次の月')} data-testid="cal-next">›</button>
          </div>
          <div className="cal-grid cal-week">{weekdays.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => d === null ? <span key={`e${i}`} /> : (
              <button key={d} className={'cal-day' + (key(d) === sel ? ' sel' : '') + (key(d) === today ? ' today' : '') + (byDay[key(d)] ? ' has' : '')}
                onClick={() => setSel(key(d))} data-testid={`cal-day-${key(d)}`} aria-label={key(d)}>
                <span>{d}</span>
                {byDay[key(d)] && <i className="cal-mark" aria-hidden="true">🌸</i>}
              </button>
            ))}
          </div>
        </div>

        <p className="hint all-totals" data-testid="all-totals">{t('notes.all', 'これまでの合計：学習時間 {time}／学習した単語 {studied}単語／覚えた単語 {mastered}単語', { time: fmtMin(allTotals.minutes), studied: allTotals.studied, mastered: allTotals.mastered })}</p>

        <section className="note-day" data-testid="day-detail">
          <h3 className="note-day-title">{selDate.toLocaleDateString(uiLocale(), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</h3>
          {dayNotes.length > 0 && (
            <div className="day-totals" data-testid="day-totals">
              <div><span>{t('notes.total.time', '総学習時間')}</span><b data-testid="total-time">{fmtMin(dayTotals.minutes)}</b></div>
              <div><span>{t('notes.total.studied', '学習した単語')}</span><b data-testid="total-studied">{t('notes.words', '{n}単語', { n: dayTotals.studied })}</b></div>
              <div><span>{t('notes.total.mastered', '覚えた単語')}</span><b data-testid="total-mastered">{t('notes.words', '{n}単語', { n: dayTotals.mastered })}</b></div>
            </div>
          )}
          {dayNotes.length === 0 && <p className="empty">{t('notes.none', 'この日の記録はありません。')}</p>}
          {dayNotes.length > 0 && (
            <div className="note-card">
              <ul className="notebook-lines static">
                {dayNotes.flatMap((n) => n.lines).map((l, i) => (
                  <li key={i} className="note-line shown" data-testid="day-line"><span className="note-text">・{l.text}</span><Hanamaru size={40} /></li>
                ))}
              </ul>
              {dayNotes.filter((n) => n.diary).map((n) => <p key={n.id} className="note-diary" data-testid="note-diary">📔 {n.diary}</p>)}
              {dayNotes.some((n) => n.medalIds?.length) && (
                <div className="note-medals">
                  {dayNotes.flatMap((n) => n.medalIds ?? []).map((id) => medals[id] && <span key={id} className="note-medal">{medals[id].emoji} {medalName(medals[id])}</span>)}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      {tut.node}
    </div>
  );
}
