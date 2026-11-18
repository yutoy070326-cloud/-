// 「文章を学習した」と数える条件：その文章の画面を、触りながら5分以上開いていること。
// テスト用に、localStorage の lingo-reader-debug-study-ms（ミリ秒）で短くできる。
export const studyMs = () => {
  try {
    const v = Number(localStorage.getItem('lingo-reader-debug-study-ms'));
    return v > 0 ? v : 5 * 60 * 1000;
  } catch {
    return 5 * 60 * 1000;
  }
};
export const IDLE_MS = 30 * 1000; // この時間、何も触らなかったら、その間は数えない
