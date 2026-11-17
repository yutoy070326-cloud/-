import React, { useRef, useState } from 'react';
import { buildBackup, backupFileName, parseBackup, restoreBackup } from '../lib/backup.js';

// データのバックアップ／復元（ホーム画面の下部）
export default function BackupPanel({ onRestored }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null); // { kind: 'ok'|'error', text }
  const [pending, setPending] = useState(null); // 検証済みで確認待ちのバックアップ { backup, counts, name }

  const download = () => {
    const backup = buildBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    const { words, materials, folders, books = [] } = backup.data;
    setMsg({ kind: 'ok', text: `バックアップを作成しました（単語${words.length}・教材${materials.length}・フォルダー${folders.length}${books.length ? `・本${books.length}` : ''}）` });
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルをもう一度選べるように
    if (!file) return;
    setMsg(null);
    setPending(null);
    let text;
    try {
      text = await file.text();
    } catch {
      setMsg({ kind: 'error', text: 'ファイルを読み込めませんでした' });
      return;
    }
    const r = parseBackup(text);
    if (!r.ok) setMsg({ kind: 'error', text: r.error });
    else setPending({ backup: r.backup, counts: r.counts, name: file.name });
  };

  const confirmRestore = () => {
    const r = restoreBackup(pending.backup);
    if (!r.ok) {
      setMsg({ kind: 'error', text: r.error });
    } else {
      onRestored?.(r.counts);
      setMsg({ kind: 'ok', text: `復元しました（単語${r.counts.words}・教材${r.counts.materials}・フォルダー${r.counts.folders}${r.counts.books ? `・本${r.counts.books}` : ''}）` });
    }
    setPending(null);
  };

  return (
    <section className="backup" aria-label="データの保管">
      <h3 className="section-title">データの保管</h3>
      <p className="hint">学習データはこの端末のブラウザに自動で保存されています。機種変更やキャッシュ削除に備えて、ときどきバックアップしてください。</p>
      <div className="backup-actions">
        <button className="btn block" onClick={download} data-testid="backup-download">
          ⬇ データをバックアップ（JSONファイルでダウンロード）
        </button>
        <button className="btn block" onClick={() => fileRef.current?.click()} data-testid="backup-restore">
          ⬆ データを復元（ファイルを選択して読み込み）
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} data-testid="backup-file" />
      </div>

      {pending && (
        <div className="backup-confirm" role="alertdialog" aria-label="復元の確認">
          <p>
            「{pending.name}」を読み込みます。
            <br />
            単語 {pending.counts.words}・文章 {pending.counts.materials}・フォルダー {pending.counts.folders}
            {pending.counts.books > 0 && <>・本 {pending.counts.books}</>}
            <br />
            <b>いまのデータはすべて、このバックアップの内容に置き換わります。</b>
          </p>
          <div className="folder-actions">
            <button className="btn danger small" onClick={confirmRestore} data-testid="backup-confirm">復元する</button>
            <button className="btn ghost small" onClick={() => setPending(null)}>やめる</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.kind === 'error' ? 'form-error' : 'backup-ok'} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
    </section>
  );
}
