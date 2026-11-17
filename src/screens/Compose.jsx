import React from 'react';
import PasteForm from '../components/PasteForm.jsx';
import { KIND_OPTIONS } from '../components/KindPicker.jsx';

// ライブラリの「＋」から来た登録画面（記事・歌詞・長文問題・その他）
export default function Compose({ kind, onBack, onStart, onMaterialsChanged }) {
  const k = KIND_OPTIONS.find((o) => o.code === kind) ?? KIND_OPTIONS[4];
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title" data-testid="compose-title">{k.ico} {k.title}を追加</h2>
        <span className="topbar-spacer" />
      </header>
      <main className="content" data-testid="compose">
        <p className="hint">{k.sub}</p>
        <PasteForm fixedKind={kind} onStart={onStart} onMaterialsChanged={onMaterialsChanged} />
      </main>
    </div>
  );
}
