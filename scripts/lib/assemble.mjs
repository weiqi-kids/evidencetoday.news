/** 把多個策略 Bucket 合併成一個三桶。 */
export function mergeBuckets(buckets) {
  return {
    topicCandidates: buckets.flatMap((b) => b.topicCandidates ?? []),
    writingDirectives: buckets.flatMap((b) => b.writingDirectives ?? []),
    siteOptimizations: buckets.flatMap((b) => b.siteOptimizations ?? []),
  };
}

/** 依事件量/GSC 列數標記資料是否稀疏。 */
export function computeDataHealth({ ga4Events, gscRows }) {
  return { ga4Events, gscRows, sparse: ga4Events < 100 || gscRows < 10 };
}

/** 空桶輸出（停用 / 無 token / 例外時用）。 */
export function emptyBucketFile(generatedAt, cfg, reason) {
  return {
    generatedAt,
    window: { ga4Days: cfg?.windowDays ?? 0, gscDays: cfg?.windowDays ?? 0 },
    dataHealth: { ga4Events: 0, gscRows: 0, sparse: true, note: reason },
    topicCandidates: [], writingDirectives: [], siteOptimizations: [],
  };
}
