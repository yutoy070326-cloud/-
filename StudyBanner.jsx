import React from 'react';
import { streakDays, studiedToday } from '../lib/studyLog.js';
import { notifySupported, permissionState } from '../lib/notify.js';

// ホーム上部の、温かい一言バナー（今日の復習件数・連続学習日数）
export default function StudyBanner({ now, dueCount, wordCount, onOpenReview, onOpenNotify }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const streak = streakDays(now);
  const done = studiedToday(now);
  const perm = permissionState();

  let msg;
  if (dueCount > 0) msg = `今日復習する単語が${dueCount}件あります`;
  else if (wordCount === 0) msg = 'まずは文章を読んで、単語を保存してみましょう';
  else if (done) msg = '今日の学習はバッチリ！おつかれさまです';
  else msg = '今日の復習はありません。1ページ読んでみませんか？';

  let sub = '';
  if (streak > 0) sub = done ? `${streak}日連続学習中！` : `${streak}日連続中です。今日も続けましょう`;
  else if (wordCount > 0) sub = '今日から連続記録をはじめよう';

  return (
    <section className={'study-banner' + (dueCount > 0 ? ' due' : '')} data-testid="study-banner" aria-live="polite">
      <div className="sb-main">
        <span className="sb-ico" aria-hidden="true">{dueCount > 0 ? '⏰' : streak > 0 ? '🔥' : '🌱'}</span>
        <div className="sb-text">
          <b data-testid="sb-msg">{msg}</b>
          {sub && <small data-testid="sb-streak">{streak > 0 ? '🔥 ' : ''}{sub}</small>}
        </div>
        {dueCount > 0 && (
          <button className="btn primary sb-go" onClick={onOpenReview} data-testid="sb-review">復習する</button>
        )}
      </div>
      {notifySupported() && perm !== 'granted' && perm !== 'denied' && (
        <button className="btn link sb-notify" onClick={onOpenNotify} data-testid="sb-enable">
          🔔 復習のタイミングを通知で受け取る
        </button>
      )}
    </section>
  );
}
