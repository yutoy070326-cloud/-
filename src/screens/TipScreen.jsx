import React, { useState } from 'react';
import { TIPS } from '../lib/tips.js';
import { t } from '../lib/i18n.js';

// 文章・物語に進む前に挟む「ヒント・豆知識」の画面。「文章に進む」を押すと、文章へ進む
export default function TipScreen({ onContinue }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  const another = () => setI((k) => (k + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length);
  return (
    <div className="screen tip-screen" data-testid="tip-screen">
      <main className="tip-screen-body">
        <div className="tip-screen-ico" aria-hidden="true">💡</div>
        <h2 className="tip-screen-title">{t('tip.title', '💡 ヒント・豆知識')}</h2>
        <p className="tip-screen-text" data-testid="tip-text">{t(`tip.${i}`, TIPS[i])}</p>
        <button type="button" className="btn link" onClick={another} data-testid="tip-another">{t('tip.next', '別のヒント ↻')}</button>
        <button type="button" className="btn primary block tip-screen-go" onClick={onContinue} data-testid="tip-continue" autoFocus>
          {t('tip.go', '文章に進む ›')}
        </button>
      </main>
    </div>
  );
}
