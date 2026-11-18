import React from 'react';
import PasteForm from '../components/PasteForm.jsx';
import { KIND_OPTIONS } from '../components/KindPicker.jsx';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';
import { useBackHandler } from '../lib/backRegistry.js';

// ライブラリの「＋」から来た登録画面（記事・歌詞・長文問題・その他）
export default function Compose({ kind, onBack, onStart, onMaterialsChanged }) {
  const tut = useScreenTutorial('compose');
  useBackHandler(onBack);
  const k = KIND_OPTIONS.find((o) => o.code === kind) ?? KIND_OPTIONS[4];
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost back-btn" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title" data-testid="compose-title">{k.ico} {k.title}を追加</h2>
        <HelpButton onClick={tut.show} />
      </header>
      <main className="content" data-testid="compose">
        <p className="hint">{k.sub}</p>
        <PasteForm fixedKind={kind} onStart={onStart} onMaterialsChanged={onMaterialsChanged} />
      </main>
      {tut.node}
    </div>
  );
}
