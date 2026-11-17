import React, { useEffect, useMemo } from 'react';
import { Medal } from '../components/FinishFlow.jsx';
import { loadMedals, markMedalsSeen, MEDAL_TIERS, medalDesc } from '../lib/diary.js';
import { t, uiLocale } from '../lib/i18n.js';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';

// メダルアルバム：獲得したメダルが並ぶ。まだのメダルは「？？？」で、手に入れ方もわからない。
// 獲得して初めてアルバムを開いたときは、そのメダルに赤文字の「NEW」が付く。
export default function MedalAlbum({ onBack }) {
  const tut = useScreenTutorial('medals');
  const medals = useMemo(loadMedals, []);
  const fresh = useMemo(() => new Set(medals.filter((m) => m.seen === false).map((m) => m.id)), [medals]);
  useEffect(() => { markMedalsSeen(); }, []); // この画面を見たので、次からは NEW を外す
  const owned = new Set(medals.map((m) => m.id));
  const locked = MEDAL_TIERS.filter((t) => !owned.has(t.id));
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>{t('common.back', '← 戻る')}</button>
        <h2 className="title">{t('medal.title', '🏅 メダルアルバム')}</h2>
        <HelpButton onClick={tut.show} />
      </header>
      <main className="content" data-testid="medal-album">
        <p className="hint">{t('medal.count', '獲得したメダル {n}個', { n: medals.length })}</p>
        <div className="medal-grid">
          {medals.map((m) => (
            <div key={m.id} className="medal-cell" data-testid="medal-cell">
              {fresh.has(m.id) && <span className="new-badge" data-testid="new-badge">NEW</span>}
              <Medal medal={m} />
              <div className="medal-cell-desc">{medalDesc(m)}</div>
              <div className="medal-cell-date">{new Date(m.at).toLocaleDateString(uiLocale())}</div>
            </div>
          ))}
          {locked.map((t) => (
            <div key={t.id} className="medal-cell locked" data-testid="medal-locked">
              <Medal medal={t} locked />
            </div>
          ))}
        </div>
      </main>
      {tut.node}
    </div>
  );
}
