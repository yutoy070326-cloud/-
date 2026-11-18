import React, { useState } from 'react';
import { TIPS } from '../lib/tips.js';
import { t } from '../lib/i18n.js';

// 学習のヒント・豆知識。開くたびにランダムで、「別のヒント」で切り替えられる
export default function LearningTip() {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  const next = () => setI((k) => (k + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length);
  return (
    <div className="tip-card" data-testid="tip">
      <div className="tip-head">{t('tip.title', '💡 ヒント・豆知識')}</div>
      <p className="tip-text" data-testid="tip-text">{t(`tip.${i}`, TIPS[i])}</p>
      <button type="button" className="btn link tip-next" onClick={next} data-testid="tip-next">{t('tip.next', '別のヒント ↻')}</button>
    </div>
  );
}
