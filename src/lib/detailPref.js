// 「いつも詳しく表示」設定。実体は settings.js（ホームの設定からも変えられる）。
import { loadSettings, saveSettings } from './settings.js';

export const loadAlwaysDetail = () => loadSettings().alwaysDetail;
export const saveAlwaysDetail = (on) => saveSettings({ alwaysDetail: !!on });
