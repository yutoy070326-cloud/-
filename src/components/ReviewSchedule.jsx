import React, { useEffect, useState } from 'react';
import { langName } from '../lib/storyAI.js';
import { MIN, HOUR, DAY } from '../lib/srs.js';
import StepBadge from './StepBadge.jsx';
import { t } from '../lib/i18n.js';

// 復習予定：ステップごと → 復習の時刻ごと → 単語の一覧、の順に開いていく。
// どの段でも、そのカテゴリーの単語だけでテストできる（onTest に単語の id を渡す）。
function timeGroup(dueAt, now) {
  const d = dueAt - now;
  if (d <= 0) return t('sched.g.now', '今すぐ復習する単語');
  if (d < MIN) return t('sched.g.soon', 'まもなく復習する単語');
  if (d < HOUR) return t('sched.g.min', '{n}分後に復習する単語', { n: Math.ceil(d / MIN) });
  if (d < DAY) return t('sched.g.hour', '{n}時間後に復習する単語', { n: Math.ceil(d / HOUR) });
  return t('sched.g.day', '{n}日後に復習する単語', { n: Math.ceil(d / DAY) });
}

export default function ReviewSchedule({ words, now, showLang, resetKey, onTest }) {
  const [step, setStep] = useState(null); // null: ステップ一覧 / 0〜4: そのステップ / 'mastered'
  const [group, setGroup] = useState(null); // 復習時刻のカテゴリー（ラベル）
  useEffect(() => { setStep(null); setGroup(null); }, [resetKey]);

  const learning = words.filter((w) => !w.mastered);
  const mastered = words.filter((w) => w.mastered);
  const byStep = [0, 1, 2, 3, 4].map((s) => ({ s, list: learning.filter((w) => (w.step ?? 0) === s) }));

  const Test = ({ ids, label }) => (
    <button type="button" className="btn small sched-test" onClick={(e) => { e.stopPropagation(); onTest(ids); }} data-testid="sched-test">
      {label ?? t('sched.test', 'テスト')}
    </button>
  );
  const Crumb = ({ children, onBack }) => (
    <button type="button" className="sched-back" onClick={onBack} data-testid="sched-back">‹ {children}</button>
  );

  // ---- 1段目：ステップごと ----
  if (step === null) {
    return (
      <div className="sched" data-testid="sched-steps">
        <h3 className="section-title">{t('sched.title', '復習の予定')}</h3>
        {byStep.map(({ s, list }) => (
          <div key={s} className={'sched-row' + (list.length === 0 ? ' empty' : '')} role="button" tabIndex={0}
            onClick={() => list.length > 0 && setStep(s)} onKeyDown={(e) => e.key === 'Enter' && list.length > 0 && setStep(s)} data-testid={`sched-step-${s + 1}`}>
            <span className={`step-badge s${s + 1}`}>{t('sched.step', 'ステップ{n}', { n: s + 1 })}</span>
            <span className="sched-count">{t('sched.words', '{n}単語', { n: list.length })}</span>
            {list.length > 0 && <><Test ids={list.map((w) => w.id)} /><span className="sched-chev">›</span></>}
          </div>
        ))}
        <div className={'sched-row' + (mastered.length === 0 ? ' empty' : '')} role="button" tabIndex={0}
          onClick={() => mastered.length > 0 && setStep('mastered')} data-testid="sched-step-mastered">
          <span className="step-badge mastered">{t('sched.mastered', '習得済み')}</span>
          <span className="sched-count">{t('sched.words', '{n}単語', { n: mastered.length })}</span>
          {mastered.length > 0 && <><Test ids={mastered.map((w) => w.id)} /><span className="sched-chev">›</span></>}
        </div>
      </div>
    );
  }

  const list = step === 'mastered' ? mastered : byStep[step].list;
  const stepLabel = step === 'mastered' ? t('sched.mastered', '習得済み') : t('sched.step', 'ステップ{n}', { n: step + 1 });

  // ---- 2段目：復習する時刻ごと（習得済みは、そのまま一覧へ）----
  const groups = [];
  if (step !== 'mastered') {
    for (const w of [...list].sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))) {
      const label = timeGroup(w.dueAt ?? 0, now);
      let g = groups.find((x) => x.label === label);
      if (!g) groups.push((g = { label, words: [] }));
      g.words.push(w);
    }
  }

  if (step !== 'mastered' && group === null) {
    return (
      <div className="sched" data-testid="sched-groups">
        <Crumb onBack={() => setStep(null)}>{t('sched.back', 'ステップ一覧')}</Crumb>
        <h3 className="section-title">{stepLabel}：{t('sched.words', '{n}単語', { n: list.length })}</h3>
        {groups.map((g) => (
          <div key={g.label} className="sched-row" role="button" tabIndex={0} onClick={() => setGroup(g.label)} onKeyDown={(e) => e.key === 'Enter' && setGroup(g.label)} data-testid="sched-group">
            <span className="sched-label">{g.label}</span>
            <span className="sched-count">{t('sched.words', '{n}単語', { n: g.words.length })}</span>
            <Test ids={g.words.map((w) => w.id)} />
            <span className="sched-chev">›</span>
          </div>
        ))}
        <Test ids={list.map((w) => w.id)} label={t('sched.test.step', 'このステップをまとめてテスト')} />
      </div>
    );
  }

  // ---- 3段目：単語の一覧 ----
  const shownWords = step === 'mastered' ? list : groups.find((g) => g.label === group)?.words ?? [];
  return (
    <div className="sched" data-testid="sched-words">
      <Crumb onBack={() => (step === 'mastered' ? setStep(null) : setGroup(null))}>{step === 'mastered' ? t('sched.back', 'ステップ一覧') : stepLabel}</Crumb>
      <h3 className="section-title">{step === 'mastered' ? stepLabel : group}：{t('sched.words', '{n}単語', { n: shownWords.length })}</h3>
      <ul className="mini-list" data-testid="cat-words">
        {shownWords.map((w) => (
          <li key={w.id}>
            <span className="mini-word">{w.lemma}</span>
            {showLang && <span className="word-lang">{langName(w.lang)}</span>}
            <span className="mini-sub"><StepBadge w={w} /></span>
          </li>
        ))}
      </ul>
      <Test ids={shownWords.map((w) => w.id)} label={t('sched.test.cat', 'このカテゴリーをテスト')} />
    </div>
  );
}
