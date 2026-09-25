import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

/** BB's updatedAt also changes for thread metadata and runtime reconciliation.
 * latestAttentionAt tracks conversation activity without those incidental writes.
 * While a run is active, updatedAt keeps the current conversation in Today.
 */
export function conversationActivityAt(thread: PluginSidebarThread): number {
  const settled = Math.max(thread.createdAt, thread.latestAttentionAt);
  return thread.indicator === "runtime" || thread.indicator === "working-draft"
    ? Math.max(settled, thread.updatedAt)
    : settled;
}
