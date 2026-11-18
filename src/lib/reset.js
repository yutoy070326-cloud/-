// 学習データのリセット：単語・文章・本・ファイル・フォルダー・達成ノート・メダル・スタンプ・積み木・並び順・
// 連続学習日数・学習中のセッションを、すべて削除する。表示言語・色・音声などの「設定」と、使い方の既読は残す。
import { KEYS } from './storage.js';
import { NOTES_KEY, MEDALS_KEY } from './diary.js';
import { SHELF_KEY } from './shelf.js';

export const LEARNING_KEYS = [
  ...Object.values(KEYS), // 単語・文章・フォルダー・本・ファイル
  NOTES_KEY, // 達成ノート（総学習時間・学習した単語数・覚えた単語数もここから集計）
  MEDALS_KEY, // メダル
  SHELF_KEY, // スタンプ・積み木・山の並び順
  'lingo-reader-study:v1', // 連続学習日数の記録
  'lingo-reader-session:v1', // 今回の学習（開始時刻・キャラクター）
];

// 返り値: 消したキーの数
export function resetAllLearningData() {
  let n = 0;
  for (const k of LEARNING_KEYS) {
    try {
      if (localStorage.getItem(k) !== null) n += 1;
      localStorage.removeItem(k);
    } catch {
      /* 消せなくても続ける */
    }
  }
  return n;
}
