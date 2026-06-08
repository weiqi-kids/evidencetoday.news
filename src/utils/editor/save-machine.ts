export type SaveState = 'success' | 'conflict' | 'forbidden' | 'network';

export type SaveOutcome = { state: SaveState; message: string };

export function classifySave(status: number): SaveOutcome {
  if (status === 200 || status === 201) {
    return { state: 'success', message: '已存檔，部署中（約 1–2 分鐘上線）。' };
  }
  if (status === 409) {
    return {
      state: 'conflict',
      message: '檔案已被自動化管線或他人更新。請按「重新載入最新版」，把修改重做一次再存；若反覆衝突，請聯絡網站工程師協助處理合併。',
    };
  }
  if (status === 403) {
    return {
      state: 'forbidden',
      message: '此 GitHub 帳號對 repo 無寫入權，無法存檔。請確認登入的是管理者帳號，或聯絡網站工程師開通權限。',
    };
  }
  return {
    state: 'network',
    message: '網路或 GitHub 連線異常，變更尚未送出。請檢查網路後再按存檔；你的編輯內容仍保留在此頁。',
  };
}
