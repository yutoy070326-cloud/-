// 初回チュートリアルの表示設定（端末ごとの設定なので、バックアップの対象外）
const KEY = 'lingo-reader-tutorial:v1';

export function loadTutorialPref() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// 一度も見ていない、または「今後も表示する」を選んだ場合に起動時に表示する
export const shouldShowTutorial = () => !loadTutorialPref()?.hide;

export function saveTutorialPref(hide) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ hide: !!hide, seenAt: Date.now() }));
  } catch {
    /* ignore */
  }
}
