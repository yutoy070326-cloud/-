// ===== エビングハウスの忘却曲線にもとづく復習スケジュール =====
//
// step = これまでにクリアした復習の回数（0〜5）
//   step 0 : 保存した直後（初回学習）。最初の復習は保存から 20分後
//   step 1 : ステップ1クリア → 次は 1時間後
//   step 2 : ステップ2クリア → 次は 1日後
//   step 3 : ステップ3クリア → 次は 1週間後
//   step 4 : ステップ4クリア → 次は 1か月後
//   step 5 : ステップ5クリア → 習得済み（マスター）
// 「忘れた」は step 0 に戻り、20分後にもう一度出題。

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

// INTERVALS[step] = 現在の step から「次の復習」までの待ち時間
export const INTERVALS = [20 * MIN, 1 * HOUR, 1 * DAY, 7 * DAY, 30 * DAY];
export const STEP_LABELS = ['20分後', '1時間後', '1日後', '1週間後', '1か月後'];
export const MAX_STEP = INTERVALS.length; // 5

// 保存された時点の復習状態
export function newSrs(savedAt = Date.now()) {
  return {
    step: 0,
    dueAt: savedAt + INTERVALS[0],
    mastered: false,
    lastReviewedAt: null,
    reviewCount: 0,
    lapses: 0,
  };
}

// 復習フィールドを持たない（旧バージョンで保存した）単語に、初期状態を補う
export function normalizeWord(w) {
  if (typeof w.step === 'number' && (w.mastered || typeof w.dueAt === 'number')) return w;
  return { ...newSrs(w.savedAt ?? Date.now()), ...w, step: 0, dueAt: (w.savedAt ?? Date.now()) + INTERVALS[0] };
}

export const isDue = (w, now = Date.now()) => !w.mastered && w.dueAt <= now;

// 復習の結果を反映した新しい単語オブジェクトを返す（元は変更しない）
export function applyReview(w, remembered, now = Date.now()) {
  if (w.mastered) return w;
  const base = { ...w, lastReviewedAt: now, reviewCount: (w.reviewCount ?? 0) + 1 };
  if (!remembered) {
    return { ...base, step: 0, dueAt: now + INTERVALS[0], lapses: (w.lapses ?? 0) + 1 };
  }
  const step = w.step + 1;
  if (step >= MAX_STEP) return { ...base, step: MAX_STEP, mastered: true, dueAt: null };
  return { ...base, step, dueAt: now + INTERVALS[step] };
}

// 自由復習（いつでもテスト）での結果の反映。
//  - 期限が来ているカード … 通常の復習と同じ（applyReview）
//  - 期限前／習得済みのカード … 「わかる」ではスケジュールは変えない（早押しでステップが進むのを防ぐ）
//                                「忘れた」ならステップ1に戻す（忘れていたという事実は反映する）
export function applyPractice(w, remembered, now = Date.now()) {
  if (isDue(w, now)) return applyReview(w, remembered, now);
  const base = { ...w, lastReviewedAt: now, practiceCount: (w.practiceCount ?? 0) + 1 };
  if (remembered) return base;
  if (w.step === 0 && !w.mastered) return base; // すでにステップ1：予定はそのまま
  return { ...base, step: 0, dueAt: now + INTERVALS[0], mastered: false, lapses: (w.lapses ?? 0) + 1 };
}

// 表示用のステップ情報。n = 次に受ける復習のステップ番号（1〜5）。習得済みは null
export function stepInfo(w) {
  return w.mastered ? { mastered: true, n: null } : { mastered: false, n: Math.min(w.step + 1, MAX_STEP) };
}

// 「あと◯分」などの表示
export function formatRemaining(dueAt, now = Date.now()) {
  const d = dueAt - now;
  if (d <= 0) return '今すぐ';
  if (d < MIN) return 'まもなく';
  if (d < HOUR) return `あと${Math.ceil(d / MIN)}分`;
  if (d < DAY) return `あと${Math.ceil(d / HOUR)}時間`;
  return `あと${Math.ceil(d / DAY)}日`;
}
