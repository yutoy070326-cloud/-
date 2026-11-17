import React, { useState } from 'react';

// 長押し／右クリックで開くメニュー（編集・削除）。削除は確認ダイアログを挟む。
// props: title, detail（削除時の補足）, onEdit, onDelete, onClose
export default function ItemMenu({ title, detail, onEdit, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet menu-sheet" role="dialog" aria-label={confirming ? '削除の確認' : 'メニュー'} onClick={(e) => e.stopPropagation()}>
        <h3 className="sheet-title menu-title">{title}</h3>
        {!confirming ? (
          <div className="menu-actions">
            <button className="btn block" onClick={onEdit} data-testid="menu-edit">✏️ 編集</button>
            <button className="btn block danger-text" onClick={() => setConfirming(true)} data-testid="menu-delete">🗑 削除</button>
            <button className="btn ghost block" onClick={onClose}>キャンセル</button>
          </div>
        ) : (
          <div role="alertdialog" aria-label="削除の確認" data-testid="delete-confirm">
            <p className="menu-confirm">「{title}」を削除しますか？<br />{detail}</p>
            <div className="sheet-actions">
              <button className="btn" onClick={() => setConfirming(false)}>やめる</button>
              <button className="btn danger" onClick={onDelete} data-testid="delete-confirm-yes">削除する</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
