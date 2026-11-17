import React, { useEffect, useState } from 'react';
import {
  loadNotify,
  saveNotify,
  permissionState,
  requestPermission,
  showNotice,
  dueCount,
  reviewMessage,
  dailyMessage,
  scheduleDailyTrigger,
} from '../lib/notify.js';

// 通知設定シート：許可の取得／復習通知／毎日のリマインド（時刻）／テスト通知
export default function NotifySettings({ onClose }) {
  const [st, setSt] = useState(loadNotify);
  const [perm, setPerm] = useState(permissionState);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const h = () => setPerm(permissionState());
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  const update = (patch) => {
    setSt(saveNotify(patch));
    scheduleDailyTrigger();
  };

  const ask = async () => {
    const r = await requestPermission();
    setPerm(r);
    setMsg(r === 'granted' ? '通知をオンにしました' : r === 'denied' ? '通知がブロックされています。ブラウザ／端末の設定で許可してください' : '');
  };

  const test = async () => {
    const n = dueCount();
    const ok = await showNotice(n > 0 ? reviewMessage(n) : dailyMessage());
    setMsg(ok ? 'テスト通知を送りました' : '通知を表示できませんでした');
  };

  const on = perm === 'granted';

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet notify-sheet" role="dialog" aria-label="通知設定" onClick={(e) => e.stopPropagation()} data-testid="notify-sheet">
        <h3 className="sheet-title">🔔 通知設定</h3>

        {perm === 'unsupported' && (
          <p className="hint" data-testid="np-unsupported">
            このブラウザは通知に対応していません。画面内のお知らせ（バナー・バッジ）は引き続き表示されます。iPhone は「ホーム画面に追加」したアプリから使えます。
          </p>
        )}
        {perm === 'default' && (
          <button className="btn primary block" onClick={ask} data-testid="np-allow">通知を許可する</button>
        )}
        {perm === 'denied' && (
          <p className="form-error" data-testid="np-denied">通知がブロックされています。ブラウザ／端末の設定から許可してください。</p>
        )}
        {on && <p className="hint ok" data-testid="np-granted">✅ 通知は許可されています</p>}

        <label className="switch-row">
          <span>
            <b>復習タイミングの通知</b>
            <small>忘却曲線で復習の時間になった単語があるとお知らせ</small>
          </span>
          <input type="checkbox" checked={st.review} onChange={(e) => update({ review: e.target.checked })} data-testid="np-review" />
        </label>

        <label className="switch-row">
          <span>
            <b>毎日の学習リマインド</b>
            <small>毎日この時刻に「今日の学習をしましょう！」</small>
          </span>
          <input type="checkbox" checked={st.daily} onChange={(e) => update({ daily: e.target.checked })} data-testid="np-daily" />
        </label>

        <label className="switch-row time-row">
          <span><b>通知する時刻</b></span>
          <input
            type="time"
            className="input"
            value={st.time}
            disabled={!st.daily}
            onChange={(e) => e.target.value && update({ time: e.target.value, lastDailyDay: '' })}
            data-testid="np-time"
          />
        </label>

        {on && (
          <button className="btn block" onClick={test} data-testid="np-test">テスト通知を送る</button>
        )}
        {msg && <p className="hint" role="status" data-testid="np-msg">{msg}</p>}

        <p className="hint small">
          ※ 通知はアプリ（ホーム画面に追加したPWA）が動作している間に届きます。サーバーを使わないため、アプリを完全に終了している間は届かない場合があります。
        </p>

        <div className="sheet-actions">
          <button className="btn primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
