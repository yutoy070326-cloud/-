import React, { useEffect, useState } from 'react';
import { loadTutorialPref, saveTutorialPref } from '../lib/tutorial.js';

const SLIDES = [
  {
    ico: '📚',
    title: 'ようこそ Lingo Reader へ',
    body: ['好きな文章が、そのまま教科書になります。', 'ライブラリの「＋」から、本・記事・歌詞・長文問題・その他を追加して、読みながら学びましょう。'],
  },
  {
    ico: '👆',
    title: 'タップして、読んで、覚える',
    body: ['単語をタップすると意味が出ます（もう一度タップで解除）。', '右上の「保存」でハイライトした単語をまとめて単語帳へ。長押しでなぞった範囲は、文やフレーズの翻訳が出ます。', '「訳」ボタンで、一文ごとの日本語訳も読めます。'],
  },
  {
    ico: '🧠',
    title: '忘れる前に、復習',
    body: ['保存した単語は、20分後 → 1時間後 → 1日後 → 1週間後 → 1か月後と、忘却曲線に合わせて復習できます。', '答えは「わかる」「忘れた」の2つだけ。⭐やフォルダーで絞り込めば、いつでも好きな単語でテストできます。'],
  },
  {
    ico: '🗂',
    title: 'ライブラリを整える',
    body: ['本は表紙、ファイルはフォルダーの形で並びます。タップで開き、長押し（右クリック）で編集・削除。', '本は開始・終了ページを決めて1ページずつ登録。挿絵で番号を飛ばしても、続きから登録できます。'],
  },
  {
    ico: '💾',
    title: 'データは自動で保存されます',
    body: ['学習データはこの端末に自動保存されます。', '機種変更やキャッシュ削除に備えて、ホーム画面の下の「データの保管」からバックアップしておくと安心です。', 'この説明は、ライブラリ右上の「使い方」からいつでも見直せます。'],
  },
];

// 使い方の説明（初回起動時／「使い方」ボタンから再表示）
export default function Tutorial({ onClose }) {
  const [i, setI] = useState(0);
  // 初回は「次回から表示しない」をオンにしておく（外せば、次回も表示される）。再表示のときは保存済みの設定を反映
  const [hide, setHide] = useState(() => {
    const pref = loadTutorialPref();
    return pref ? !!pref.hide : true;
  });
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  const close = () => {
    saveTutorialPref(hide);
    onClose();
  };

  // Esc キーでもスキップできる
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="sheet-backdrop tutorial-backdrop">
      <div className="tutorial" role="dialog" aria-modal="true" aria-label="使い方" data-testid="tutorial">
        <button className="tutorial-skip" onClick={close} data-testid="tutorial-skip">
          {last ? '閉じる' : 'スキップ ✕'}
        </button>
        <div className="tutorial-body" key={i} style={{ paddingTop: 22 }}>
          <div className="tutorial-ico" aria-hidden="true">{s.ico}</div>
          <h2 className="tutorial-title" data-testid="tutorial-title">{s.title}</h2>
          {s.body.map((t) => <p key={t} className="tutorial-text">{t}</p>)}
        </div>
        <div className="tutorial-dots" aria-label={`${i + 1} / ${SLIDES.length}`}>
          {SLIDES.map((_, k) => <span key={k} className={'dot' + (k === i ? ' on' : '')} />)}
        </div>
        <label className="tutorial-check">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} data-testid="tutorial-hide" />
          次回から表示しない
        </label>
        <div className="tutorial-nav">
          <button className="btn" onClick={() => setI(i - 1)} disabled={i === 0}>戻る</button>
          {last ? (
            <button className="btn primary" onClick={close} data-testid="tutorial-start">はじめる</button>
          ) : (
            <button className="btn primary" onClick={() => setI(i + 1)} data-testid="tutorial-next">次へ</button>
          )}
        </div>
      </div>
    </div>
  );
}
