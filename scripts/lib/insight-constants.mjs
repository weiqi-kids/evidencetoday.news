// GA4 / GSC 端點與識別碼。對齊 ~/ga4-report.py。
export const GA4_PROPERTY = 'properties/541692554'; // evidencetoday.news (G-5JH83LM8X7)
export const GSC_SITE = 'sc-domain:evidencetoday.news';
export const SERVICE_ACCOUNT = 'ga4-insights@yaocare.iam.gserviceaccount.com';
export const GA4_URL = `https://analyticsdata.googleapis.com/v1beta/${GA4_PROPERTY}:runReport`;
export const GSC_URL = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
export const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/webmasters.readonly';
export const CONTENT_TYPES = ['articles', 'myths', 'ingredients', 'podcasts', 'videos', 'news'];
export const OUTPUT_PATH = 'data/audience-insights.json';
