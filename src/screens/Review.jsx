import React, { useEffect, useState } from 'react';
import { loadWordbook, reviewWord } from '../lib/storage.js';
import { langName } from '../lib/storyAI.js';
import { isDue, applyPractice, STEP_LABELS, formatRemaining } from '../lib/srs.js';
import { matchesFilter } from '../lib/folders.js';
import StepBadge from '../components/StepBadge.jsx';
import WordDetail, { hasDetail } from '../components/WordDetail.jsx';
import { getDetail } from '../lib/dictionary.js';
import FormTags from '../components/FormTags.jsx';
import ConjTable from '../components/ConjTable.jsx';
import SpeakButton from '../components/SpeakButton.jsx';
import Reading from '../components/Reading.jsx';
import { loadAlwaysDetail, saveAlwaysDetail } from '../lib/detailPref.js';
import { loadSettings } from '../lib/settings.js';

// 例文の中の学習対象の語を目立たせる
function Context({ context, text }) {
  if (!context) return null;
  const i = text ? context.toLowerCase().indexOf(text.toLowerCase()) : -1;
  if (i < 0) return <p className="fc-context">“{context}”</p>;
  return (
    <p className="fc-context">
      “{context.slice(0, i)}
      <mark>{context.slice(i, i + text.length)}</mark>
      {context.slice(i + text.length)}”
    </p>
  );
}

// filter: { lang, source, fav, scope: 'due' | 'all' }
//  scope 'due' = 期限が来ているカードだけ / 'all' = 絞り込み範囲の全カード（期限が来ているものを先頭に）
export default function Review({ filter, onExit }) {
  // 開始時点の出題リストを固定する
  const [cards, setCards] = useState(() => {
    const now = Date.now();
    const pool = loadWordbook().filter((w) => matchesFilter(w, filter));
    const byDue = (a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity);
    if (filter.scope === 'due') return pool.filter((w) => isDue(w, now)).sort(byDue);
    return [...pool.filter((w) => isDue(w, now)).sort(byDue), ...pool.filter((w) => !isDue(w, now)).sort(byDue)];
  });
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ ok: 0, ng: 0, mastered: 0 });
  const [feedback, setFeedback] = useState(null); // { ok, text }
  const [detailOpen, setDetailOpen] = useState(false); // 「詳しく見る」を開いているか
  const [alwaysDetail, setAlwaysDetail] = useState(loadAlwaysDetail);
  const showReading = loadSettings().showReading;
  const [tableOpen, setTableOpen] = useState(false); // 活用表（何形・何人称のラベルを押すと開く）

  useEffect(() => {
    if (!feedback) return undefined;
    const t = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const total = cards.length;
  const done = i >= total;
  const cur = done ? null : cards[i];
  // 辞書から何形か・活用表・ほかの意味を引く（保存データは増やさず、表示のたびに引く）
  const lemmaPron = cur ? getDetail(cur.lang, cur.lemma)?.pron : null; // 表面に出している原形の読み
  const detail = cur ? getDetail(cur.lang, cur.text || cur.lemma) ?? getDetail(cur.lang, cur.lemma) : null;

  const answer = (remembered) => {
    if (!cur) return;
    const now = Date.now();
    const wasDue = isDue(cur, now);
    reviewWord(cur.id, remembered, now); // 保存（期限前は予定を変えない：applyPractice）
    const next = applyPractice(cur, remembered, now);
    setCards((cs) => cs.map((c, k) => (k === i ? next : c)));
    setStats((st) => ({
      ok: st.ok + (remembered ? 1 : 0),
      ng: st.ng + (remembered ? 0 : 1),
      mastered: st.mastered + (wasDue && next.mastered ? 1 : 0),
    }));
    let text;
    if (!remembered) text = next.step === 0 ? `ステップ1に戻りました。${STEP_LABELS[0]}にもう一度出題します` : '';
    else if (wasDue) text = next.mastered ? `「${cur.lemma}」を習得しました 🎉` : `わかる！ 次の復習は${STEP_LABELS[next.step]}（ステップ${next.step + 1}）`;
    else text = cur.mastered ? 'わかる！ 習得済みのままです' : 'わかる！ 期限前なので予定は変わりません';
    setFeedback({ ok: remembered, text });
    setI(i + 1);
    setFlipped(false);
    setDetailOpen(false);
    setTableOpen(false);
  };

  // 次に復習が来る時刻（終了画面で表示）
  const nextDue = (() => {
    const all = loadWordbook().filter((w) => !w.mastered && matchesFilter(w, filter));
    return all.length ? Math.min(...all.map((w) => w.dueAt)) : null;
  })();

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onExit} aria-label="復習を終了">
          ← 終了
        </button>
        <h2 className="title">{filter.scope === 'due' ? '単語の復習' : '単語テスト'}</h2>
        <span className="topbar-spacer" />
      </header>

      <main className="content review">
        {!done && (
          <>
            <div className="progress" aria-label="進み具合">
              <div className="progress-bar" style={{ width: `${(i / total) * 100}%` }} />
            </div>
            <div className="progress-label" data-testid="progress">
              {i + 1} / {total}
            </div>
          </>
        )}

        {feedback && (
          <div className={'fc-feedback ' + (feedback.ok ? 'ok' : 'ng')} role="status" data-testid="feedback">
            {feedback.text}
          </div>
        )}

        {!done && cur && (
          <>
            <div
              className={'flip' + (flipped ? ' flipped' : '') + ((hasDetail(detail) && (detailOpen || alwaysDetail)) || tableOpen ? ' tall' : '')}
              role="button"
              tabIndex={0}
              aria-label={flipped ? '表面に戻す' : 'タップして意味を見る'}
              onClick={() => setFlipped((f) => !f)}
              onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setFlipped((f) => !f)}
              data-testid="card"
            >
              <div className="flip-inner">
                <div className="flip-face front" data-testid="card-front">
                  <div className="fc-top">
                    <span className="word-lang">{langName(cur.lang)}</span>
                    <StepBadge w={cur} />
                  </div>
                  <div className="fc-word" lang={cur.lang}>{cur.lemma}</div>
                  <div className="fc-sub">
                    <SpeakButton text={cur.lemma} lang={cur.lang} />
                    {showReading && <Reading pron={lemmaPron} />}
                  </div>
                  {cur.text && cur.text.toLowerCase() !== String(cur.lemma).toLowerCase() && (
                    <div className="fc-form">
                      本文中: {cur.text}
                      <FormTags
                        tags={detail?.formTags}
                        open={tableOpen}
                        onToggle={detail?.table ? () => setTableOpen((o) => !o) : undefined}
                      />
                    </div>
                  )}
                  {tableOpen && detail?.table && <ConjTable table={detail.table} />}
                  <Context context={cur.context} text={cur.text} />
                  <div className="fc-hint">タップして意味を見る</div>
                </div>
                <div className="flip-face back" data-testid="card-back">
                  <div className="fc-top">
                    <span className="fc-back-word">{cur.lemma}</span>
                    <StepBadge w={cur} />
                  </div>
                  <div className="fc-meaning">{cur.meaning}</div>
                  {cur.conj && <div className="fc-conj">{cur.conj}</div>}
                  <WordDetail
                    key={cur.id}
                    detail={detail}
                    open={detailOpen}
                    always={alwaysDetail}
                    onToggle={() => setDetailOpen((o) => !o)}
                  />
                  {hasDetail(detail) && (
                    <label className="wd-always" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={alwaysDetail}
                        onChange={(e) => {
                          setAlwaysDetail(e.target.checked);
                          saveAlwaysDetail(e.target.checked);
                        }}
                      />
                      いつも詳しく表示
                    </label>
                  )}
                  <div className="fc-hint">もう一度タップで表に戻る</div>
                </div>
              </div>
            </div>

            <div className="judge">
              <button className="btn judge-ng" onClick={() => answer(false)} data-testid="btn-forgot">
                <span className="judge-ico">✗</span> 忘れた
                <small>ステップ1に戻る</small>
              </button>
              <button className="btn judge-ok" onClick={() => answer(true)} data-testid="btn-remembered">
                <span className="judge-ico">✓</span> わかる
                <small>{isDue(cur) ? '次のステップへ' : '予定は変わりません'}</small>
              </button>
            </div>
          </>
        )}

        {done && (
          <section className="review-done" data-testid="review-done">
            {total === 0 ? (
              <>
                <h3>テストする単語がありません</h3>
                {nextDue && <p>次の復習：{formatRemaining(nextDue)}</p>}
              </>
            ) : (
              <>
                <h3>おつかれさまでした 🎉</h3>
                <div className="review-summary">
                  <div className="stat"><b data-testid="done-ok">{stats.ok}</b><span>わかる</span></div>
                  <div className="stat"><b data-testid="done-ng">{stats.ng}</b><span>忘れた</span></div>
                  <div className="stat"><b data-testid="done-mastered">{stats.mastered}</b><span>習得</span></div>
                </div>
                {nextDue && <p>次の復習：{formatRemaining(nextDue)}</p>}
              </>
            )}
            <button className="btn primary block" onClick={onExit} data-testid="review-exit">
              単語帳へ戻る
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
