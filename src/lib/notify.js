// 通知（復習リマインダー／毎日の学習リマインド）。設定は端末ごと（バックアップの対象外）。
//
// ・サーバーが無いため、本物の Web Push（アプリ完全終了中の配信）はできません。
//   アプリ（PWA）が起動している／バックグラウンドで生きている間は、
//   Service Worker の showNotification で通知します。
// ・Notification Triggers API（対応ブラウザのみ）が使える場合は、毎日の通知を事前に予約します。
import { loadWordbook } from './storage.js';
import { isDue } from './srs.js';
import { dayStr, studiedToday, streakDays } from './studyLog.js';

const KEY = 'lingo-reader-notify:v1';
export const DEFAULTS = {
  review: true, // 復習タイミングの通知
  daily: true, // 毎日の学習リマインド
  time: '20:00',
  lastReviewAt: 0,
  lastDailyDay: '',
};
export const REVIEW_GAP = 3 * 60 * 60 * 1000; // 復習通知の最短間隔
export const DAILY_WINDOW = 3 * 60 * 60 * 1000; // 設定時刻からこの間に開かれたら送る

export function loadNotify() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveNotify(patch) {
  const next = { ...loadNotify(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;
// 'unsupported' | 'default' | 'granted' | 'denied'
export const permissionState = () => (notifySupported() ? Notification.permission : 'unsupported');

export async function requestPermission() {
  if (!notifySupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export const dueCount = (now = Date.now()) => loadWordbook().filter((w) => isDue(w, now)).length;

// 設定時刻（HH:MM）の、now を含む日のタイムスタンプ
export function timeToday(hhmm, now = Date.now()) {
  const [h, m] = String(hhmm).split(':').map((x) => parseInt(x, 10) || 0);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

// 通知の文面
export function reviewMessage(n) {
  return { title: '復習のタイミングです 📝', body: `今日復習する単語が${n}件あります。1分だけ思い出してみましょう！`, tag: 'lingo-review' };
}
export function dailyMessage(now = Date.now()) {
  const s = streakDays(now);
  const n = dueCount(now);
  const parts = ['今日の学習をしましょう！'];
  if (n > 0) parts.push(`復習が${n}件待っています。`);
  if (s > 0) parts.push(`${s}日連続中、このまま続けよう🔥`);
  return { title: 'Lingo Reader', body: parts.join(' '), tag: 'lingo-daily' };
}

// 実際に通知を表示。Service Worker 経由（モバイルで必須）→ だめなら new Notification
export async function showNotice({ title, body, tag }) {
  if (permissionState() !== 'granted') return false;
  const opts = { body, tag, icon: './icon-192.png', badge: './badge-96.png', lang: 'ja', data: { url: './' } };
  try {
    if ('serviceWorker' in navigator) {
      const reg = (await navigator.serviceWorker.getRegistration()) || null;
      if (reg?.showNotification) {
        await reg.showNotification(title, opts);
        return true;
      }
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

// 通知を出すべきか判断し、出す。起動時・一定間隔・画面復帰時に呼ぶ。
// 返り値: 送った通知の種類の配列（'daily' | 'review'）
export async function checkAndNotify(now = Date.now(), { force = false } = {}) {
  const st = loadNotify();
  const sent = [];
  if (permissionState() !== 'granted') return sent;

  // 毎日のリマインド：設定時刻を過ぎて3時間以内、今日まだ送っておらず、今日まだ学習していない
  if (st.daily) {
    const at = timeToday(st.time, now);
    if (now >= at && st.lastDailyDay !== dayStr(now)) {
      if (now - at <= DAILY_WINDOW && !studiedToday(now)) {
        if (await showNotice(dailyMessage(now))) sent.push('daily');
      }
      saveNotify({ lastDailyDay: dayStr(now) }); // 見送った場合も今日は再判定しない
    }
  }

  // 復習タイミング：期限の来たカードがあり、前回の通知から一定時間が空いている
  // （同じタイミングで毎日の通知を送った場合は重ねない）
  if (st.review && !sent.length) {
    const n = dueCount(now);
    if (n > 0 && now - st.lastReviewAt >= REVIEW_GAP) {
      // アプリを見ている最中は、画面内のバナーで足りるので出さない
      if (force || document.visibilityState !== 'visible') {
        if (await showNotice(reviewMessage(n))) {
          saveNotify({ lastReviewAt: now });
          sent.push('review');
        }
      }
    }
  }
  return sent;
}

// 対応ブラウザでは、次回の毎日リマインドを事前予約（アプリ終了中でも届く）
export async function scheduleDailyTrigger(now = Date.now()) {
  try {
    const st = loadNotify();
    if (typeof TimestampTrigger === 'undefined' || !('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const old = await reg.getNotifications({ tag: 'lingo-daily', includeTriggered: true });
    old.forEach((n) => n.close());
    if (!st.daily || permissionState() !== 'granted') return false;
    let at = timeToday(st.time, now);
    if (at <= now) at += 86400000;
    const m = dailyMessage(now);
    await reg.showNotification(m.title, {
      body: '今日の学習をしましょう！',
      tag: m.tag,
      icon: './icon-192.png',
      showTrigger: new TimestampTrigger(at),
      data: { url: './' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  if (!/^https?:$/.test(location.protocol)) return null;
  try {
    return await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  } catch {
    return null;
  }
}
