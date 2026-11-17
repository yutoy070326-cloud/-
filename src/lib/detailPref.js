// 「いつも詳しく表示する」設定。端末設定なのでバックアップ対象外（ハイフン区切り）。
const KEY = 'lingo-reader-detail:v1';

export function loadAlwaysDetail() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function saveAlwaysDetail(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* 保存できなくても動作には影響しない */
  }
}
