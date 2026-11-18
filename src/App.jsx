import React, { useState, useCallback, useEffect } from 'react';
import NotifySettings from './components/NotifySettings.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import { getUiLang, setUiLang, t } from './lib/i18n.js';
import { loadSettings, saveSettings } from './lib/settings.js';
import { runBack } from './lib/backRegistry.js';
import { recordUse, decideIfDue, uxVisible } from './lib/uxExperiment.js';
import { checkAndNotify, registerServiceWorker, scheduleDailyTrigger } from './lib/notify.js';
import Home from './screens/Home.jsx';
import Reader from './screens/Reader.jsx';
import Wordbook from './screens/Wordbook.jsx';
import FileScreen from './screens/FileScreen.jsx';
import Review from './screens/Review.jsx';
import Library from './screens/Library.jsx';
import BookSetup from './screens/BookSetup.jsx';
import BookDetail from './screens/BookDetail.jsx';
import Compose from './screens/Compose.jsx';
import Tutorial from './components/Tutorial.jsx';
import { StartGate, IntroScene } from './components/StartGate.jsx';
import FinishFlow from './components/FinishFlow.jsx';
import NotesScreen from './screens/NotesScreen.jsx';
import MedalAlbum from './screens/MedalAlbum.jsx';
import StampScreen from './screens/StampScreen.jsx';
import LoginBonus from './components/LoginBonus.jsx';
import { claimLoginBonus } from './lib/shelf.js';
import { startSession, loadSession, clearSession, oppositeChar, finishSession, syncSessionNote, updateNote } from './lib/diary.js';
import { shouldShowTutorial } from './lib/tutorial.js';
import { loadWordbook, loadMaterials, loadBooks, loadFiles, migrateLibrary } from './lib/storage.js';
import { requestPersistentStorage } from './lib/backup.js';

migrateLibrary(); // 古いデータ（ファイルに入っていない文章）をファイルに移行
requestPersistentStorage(); // ブラウザに保存データを消さないよう依頼

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home' | 'reader' | 'wordbook'
  const [session, setSession] = useState(null); // { id, title, text, lang, meta }
  const [wordCount, setWordCount] = useState(() => loadWordbook().length);
  const countShelf = () => loadBooks().length + loadFiles().length;
  const [shelfCount, setShelfCount] = useState(countShelf);
  const [fileId, setFileId] = useState(null);
  const refreshShelf = () => setShelfCount(countShelf());
  // 単語帳画面の初期表示（view: 'list' | 'review'、lang: 言語タブ）と、復習の対象言語
  const [wb, setWb] = useState({ view: 'list' });
  const [reviewFilter, setReviewFilter] = useState({ lang: 'all', source: 'all', fav: false, scope: 'due' });

  const [bookId, setBookId] = useState(null);
  const [composeKind, setComposeKind] = useState('article');
  const [bookNewFrom, setBookNewFrom] = useState('home'); // 本の登録画面の戻り先
  // 初回起動（または「今後も表示する」を選んでいる間）は、使い方を表示する
  const [tutorial, setTutorial] = useState(() => (shouldShowTutorial() ? 'first' : null));
  const showTutorial = () => setTutorial('again');
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiLang, setUiLangState] = useState(getUiLang); // 画面の表示言語（変えると、画面全体が作り直されて切り替わる）
  const changeLang = (code) => { setUiLang(code); setUiLangState(code); };

  // スタート画面 → 開始演出 → アプリ → （学習を終える）→ 達成ノート・お見送り → スタート画面
  const [phase, setPhase] = useState('gate'); // 'gate' | 'intro' | 'app' | 'finish'
  const [char, setChar] = useState(null); // 開始時に出たキャラクター（'boy' | 'girl'）
  const [bonus, setBonus] = useState(null); // ログインボーナス（スタンプ＋積み木）
  const [trail, setTrail] = useState([]); // ホームから何画面ぶん進んだか
  const [finish, setFinish] = useState(null); // { noteId, lines, medals, farewellChar }
  // ホームから2画面以上進んだら「ホームへ」ボタンを出す（戻るボタンはそのまま使える）
  useEffect(() => {
    setTrail((t) => {
      if (screen === 'home') return [];
      const i = t.indexOf(screen);
      return i >= 0 ? t.slice(0, i + 1) : [...t, screen];
    });
  }, [screen]);
  const begin = () => {
    const s = startSession();
    setChar(s.char);
    setPhase('intro');
  };
  const endStudy = () => {
    const s = loadSession() ?? { startedAt: new Date().setHours(0, 0, 0, 0), char: char ?? 'boy' };
    // ノートを仕上げる（学習時間も書く）。押した時点で保存されるので、演出の途中で閉じても残る
    saveSettings({ speechRate: 1 }); // 音声の速さは、学習を終えたら標準に戻す
    const r = finishSession();
    setFinish({ noteId: r.noteId, lines: r.note?.lines ?? [], medals: r.medals, farewellChar: oppositeChar(s.char) }); // 開始時と反対のキャラクターでお見送り
    setPhase('finish');
  };

  // 新しく達成したことが見つかったら、自動で今日の達成ノートに書く（学習中、定期的に・画面を切り替えたときに確認する）
  const [toast, setToast] = useState(null);

  // ボタン配置の比較実験：期間がたっていたら、使われなかった方を消す。左上の「戻る」を押した回数も数える
  const [, setUxTick] = useState(0);
  useEffect(() => {
    const apply = () => { document.documentElement.dataset.uxBack = ['top', 'bottom'].find((w) => uxVisible('back', w) && !uxVisible('back', w === 'top' ? 'bottom' : 'top')) ?? ''; };
    if (decideIfDue()) setUxTick((n) => n + 1);
    apply();
    const onClick = (e) => { if (e.target.closest?.('.back-btn')) recordUse('back', 'top'); };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  useEffect(() => {
    if (phase !== 'app') return undefined;
    const run = () => {
      const r = syncSessionNote();
      if (r && r.added.length > 0 && loadSettings().noteToast) setToast(t('toast.note', '📓 達成ノートに書きました：{text}', { text: r.added[0].text }));
    };
    const id = setTimeout(run, 800);
    const iv = setInterval(run, 20000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, [phase, screen]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // 通知：Service Worker 登録 → 起動時・30秒ごと・画面復帰時に「出すべき通知」を判定
  useEffect(() => {
    let alive = true;
    const run = () => alive && checkAndNotify().catch(() => {});
    registerServiceWorker().then(() => {
      run();
      scheduleDailyTrigger();
    });
    const id = setInterval(run, 30000);
    document.addEventListener('visibilitychange', run);
    const onMsg = (e) => {
      if (e.data?.type === 'notification-click' && e.data.tag === 'lingo-review') {
        setWb({ view: 'review', lang: 'all' });
        setScreen('wordbook');
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', onMsg);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
      navigator.serviceWorker?.removeEventListener?.('message', onMsg);
    };
  }, []);

  // 文章（本のページ／ファイルの中の文章）を、前後の文章へ移るための情報
  const sessionOfMaterial = (m, extra = {}) => {
    const book = m.bookId ? loadBooks().find((b) => b.id === m.bookId) : null;
    if (book) {
      return { title: m.title, text: m.text, lang: book.lang, meta: null, source: 'paste', materialId: m.id, kind: 'book', bookId: book.id, sourceKey: book.id, sourceTitle: book.title };
    }
    return { title: m.title, text: m.text, lang: m.lang, meta: null, source: m.source, level: m.level, genre: m.genre, materialId: m.id, kind: m.kind, fromFile: m.fileId ?? extra.fromFile };
  };
  const navFor = (sess) => {
    const mats = loadMaterials();
    const cur = sess?.materialId ? mats.find((m) => m.id === sess.materialId) : null;
    if (!cur) return null;
    let list;
    let kind;
    if (cur.bookId) {
      list = mats.filter((m) => m.bookId === cur.bookId).sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
      kind = 'page';
    } else if (cur.fileId) {
      list = mats.filter((m) => m.fileId === cur.fileId);
      kind = 'text';
    } else return null;
    const i = list.findIndex((m) => m.id === cur.id);
    return { kind, prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, index: i + 1, total: list.length, isBook: !!cur.bookId };
  };

  const startReading = useCallback((s) => {
    setSession({ ...s, id: Date.now() });
    setScreen('reader');
  }, []);

  return (
    <div className="app" key={uiLang}>
      {screen === 'home' && (
        <Home
          wordCount={wordCount}
          shelfCount={shelfCount}
          onStart={startReading}
          onOpenWordbook={() => {
            setWb({ view: 'list', lang: session?.lang });
            setScreen('wordbook');
          }}
          onOpenReview={() => {
            setWb({ view: 'review', lang: 'all' });
            setScreen('wordbook');
          }}
          onOpenLibrary={() => setScreen('library')}
          onOpenBookNew={() => {
            setBookNewFrom('home');
            setScreen('bookNew');
          }}
          onMaterialsChanged={refreshShelf}
          onShowTutorial={showTutorial}
          onOpenNotify={() => setNotifyOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenNotes={() => setScreen('notes')}
          onOpenMedals={() => setScreen('medals')}
          onOpenStamps={() => setScreen('stamps')}
          onFinishStudy={endStudy}
          onDataRestored={(c) => {
            setWordCount(c.words);
            refreshShelf();
          }}
        />
      )}
      {screen === 'reader' && session && (
        <Reader
          key={session.id}
          session={session}
          onBack={() => {
            if (session.bookId) {
              setBookId(session.bookId);
              setScreen('book');
            } else if (session.fromFile) {
              setFileId(session.fromFile);
              setScreen('file');
            } else setScreen('home');
          }}
          onWordbookChanged={(n) => setWordCount(n)}
          onMaterialsChanged={refreshShelf}
          nav={navFor(session)}
          onGoto={(m) => startReading(sessionOfMaterial(m, { fromFile: session.fromFile }))}
          onAddPage={() => {
            if (session.bookId) {
              setBookId(session.bookId);
              setScreen('book');
            }
          }}
        />
      )}
      {screen === 'file' && (
        <FileScreen
          key={fileId}
          fileId={fileId}
          onBack={() => setScreen('library')}
          onChanged={refreshShelf}
          onOpen={(m) =>
            startReading({
              title: m.title,
              text: m.text,
              lang: m.lang,
              meta: null,
              source: m.source,
              level: m.level,
              genre: m.genre,
              materialId: m.id,
              kind: m.kind,
              fromFile: fileId,
            })
          }
        />
      )}
      {screen === 'library' && (
        <Library
          onBack={() => setScreen('home')}
          onOpenBook={(id) => {
            setBookId(id);
            setScreen('book');
          }}
          onOpenFile={(id) => {
            setFileId(id);
            setScreen('file');
          }}
          onAdd={(k) => {
            if (k === 'book') {
              setBookNewFrom('library');
              setScreen('bookNew');
            }
            else {
              setComposeKind(k);
              setScreen('compose');
            }
          }}
          onShowTutorial={showTutorial}
          onChanged={refreshShelf}
        />
      )}
      {screen === 'compose' && (
        <Compose
          kind={composeKind}
          onBack={() => setScreen('library')}
          onMaterialsChanged={refreshShelf}
          onStart={(sess) => {
            // 読み終えたら、追加先のファイルに戻る
            const m = loadMaterials().find((x) => x.id === sess.materialId);
            startReading({ ...sess, ...(m?.fileId ? { fromFile: m.fileId } : {}) });
          }}
        />
      )}
      {screen === 'bookNew' && (
        <BookSetup
          onBack={() => setScreen(bookNewFrom)}
          onBooksChanged={() => {}}
          onMaterialsChanged={refreshShelf}
          onRead={(s, id) => {
            setBookId(id);
            startReading(s);
          }}
        />
      )}
      {screen === 'book' && (
        <BookDetail
          key={bookId}
          bookId={bookId}
          onBack={() => setScreen('library')}
          onBooksChanged={() => {}}
          onMaterialsChanged={refreshShelf}
          onRead={(s) => startReading(s)}
        />
      )}
      {screen === 'review' && (
        <Review
          filter={reviewFilter}
          onExit={() => {
            setWordCount(loadWordbook().length);
            // 復習前と同じ絞り込みで、復習画面に戻る
            setWb({ view: 'review', lang: reviewFilter.lang, source: reviewFilter.source, fav: reviewFilter.fav });
            setScreen('wordbook');
          }}
        />
      )}
      {screen === 'wordbook' && (
        <Wordbook
          key={JSON.stringify(wb)}
          initial={wb}
          onBack={() => setScreen('home')}
          onChanged={(n) => setWordCount(n)}
          onStartReview={(f) => {
            setReviewFilter(f);
            setScreen('review');
          }}
        />
      )}
      {notifyOpen && <NotifySettings onClose={() => setNotifyOpen(false)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} onChangeLang={changeLang} />}
      {screen === 'notes' && <NotesScreen onBack={() => setScreen('home')} />}
      {screen === 'medals' && <MedalAlbum onBack={() => setScreen('home')} />}
      {screen === 'stamps' && <StampScreen onBack={() => setScreen('home')} />}
      {phase === 'app' && screen !== 'home' && uxVisible('back', 'bottom') && (
        <button className="back-pill" onClick={() => { recordUse('back', 'bottom'); runBack(); }} data-testid="back-bottom" aria-label={t('common.back', '← 戻る')}>{t('common.back', '← 戻る')}</button>
      )}
      {phase === 'app' && screen !== 'home' && trail.length >= 2 && (
        <button className="home-fab" onClick={() => setScreen('home')} aria-label={t('common.home', 'ホームに戻る')} data-testid="home-fab">🏠</button>
      )}
      {toast && phase === 'app' && <div className="toast" role="status" data-testid="toast">{toast}</div>}
      {phase === 'app' && bonus && <LoginBonus bonus={bonus} onClose={() => setBonus(null)} />}
      {phase === 'gate' && <StartGate onStart={begin} />}
      {phase === 'intro' && <IntroScene char={char} onDone={() => { setPhase('app'); setBonus(claimLoginBonus()); }} />}
      {phase === 'finish' && finish && (
        <FinishFlow
          lines={finish.lines}
          medals={finish.medals}
          farewellChar={finish.farewellChar}
          onSaveExtras={(x) => updateNote(finish.noteId, x)}
          onDone={() => {
            clearSession();
            setFinish(null);
            setScreen('home');
            setPhase('gate');
          }}
        />
      )}
      {tutorial && <Tutorial onClose={() => setTutorial(null)} />}
    </div>
  );
}
