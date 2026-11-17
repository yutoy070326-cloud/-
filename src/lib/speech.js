// 発音の読み上げ。ブラウザ内蔵の音声合成（Web Speech API）を使うので無料・登録不要。
// 使える声は端末（iPhone / Mac / Android / Windows）によって違う。本物の音声API（クラウドTTS）に
// 差し替える場合も、speak(text, lang) の形は維持する。
import { loadSettings } from './settings.js';

const TAGS = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP', ru: 'ru-RU', ar: 'ar-SA', id: 'id-ID', tl: 'fil-PH', th: 'th-TH' };

export const speechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

export function speak(text, lang) {
  if (!speechSupported() || !String(text ?? '').trim()) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel(); // 連打しても重ならないように、前の読み上げを止める
    const u = new window.SpeechSynthesisUtterance(String(text));
    const tag = TAGS[lang] ?? lang ?? 'en';
    u.lang = tag;
    u.rate = loadSettings().speechRate || 1; // 🐢 0.75 / 🧑 1 / 🐇 1.25（設定・各画面のスイッチ）
    const voices = synth.getVoices?.() ?? [];
    const v = voices.find((x) => x.lang === tag) ?? voices.find((x) => x.lang?.slice(0, 2) === tag.slice(0, 2));
    if (v) u.voice = v;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}
