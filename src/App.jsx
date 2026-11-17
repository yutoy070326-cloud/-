import React, { useState, useCallback, useEffect } from 'react';
import NotifySettings from './components/NotifySettings.jsx';
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

  const startReading = useCallback((s) => {
    setSession({ ...s, id: Date.now() });
    setScreen('reader');
  }, []);

  return (
    <div className="app">
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
      {tutorial && <Tutorial onClose={() => setTutorial(null)} />}
    </div>
  );
}
