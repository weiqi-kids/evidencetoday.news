export type ConsentStatus = 'granted' | 'denied' | 'unset';

export const MEASUREMENT_ID = 'G-5JH83LM8X7'; // 公開值；設 '' 可全域停用
export const CONSENT_KEY = 'et_consent';
export const CONSENT_EVENT = 'et:consent-change';

export const SCROLL_MILESTONES = [25, 50, 75, 90] as const;
export const READ_COMPLETE_THRESHOLD = 90;     // %
export const ENGAGED_IDLE_TIMEOUT_MS = 15_000; // 無活動超過此值暫停計時
export const ENGAGED_MAX_MS = 1_800_000;       // 單頁投入時間上限 30 分
export const MAX_QUEUE = 50;                    // 同意前/gtag 未就緒的事件佇列上限
export const GA_CONFIG = { anonymize_ip: true, send_page_view: true } as const;
