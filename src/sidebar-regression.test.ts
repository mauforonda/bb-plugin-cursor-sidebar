import { describe, expect, it } from "vitest";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { conversationActivityAt } from "./activity-time";
import { pageGroupRows } from "./conversations";
import type { DisplayRow } from "./forest";
import { DEFAULT_SIDEBAR_VIEW, groupOrdinaryRows } from "./sidebar-view";

const now = new Date("2026-09-25T12:00:00-04:00").getTime();
const day = 86_400_000;

function thread(
  id: string,
  latestAttentionAt: number,
  updatedAt = latestAttentionAt,
  parentThreadId: string | null = null,
): PluginSidebarThread {
  return {
    id,
    createdAt: latestAttentionAt - day,
    latestAttentionAt,
    updatedAt,
    parentThreadId,
    indicator: "none",
  } as PluginSidebarThread;
}

function row(value: PluginSidebarThread): DisplayRow {
  return { thread: value, depth: 0, guides: [] };
}

describe("sidebar recency", () => {
  it("ignores metadata updates for settled conversations but keeps a live run current", () => {
    const old = thread("old", now - 20 * day, now);
    expect(conversationActivityAt(old)).toBe(now - 20 * day);
    expect(conversationActivityAt({ ...old, indicator: "runtime" })).toBe(now);
  });

  it("groups by conversation activity and sorts across project homes", () => {
    const stale = thread("stale", now - 20 * day, now);
    const recent = thread("recent", now - 60_000);
    const earlierToday = thread("earlier", now - 3_600_000);
    const groups = groupOrdinaryRows(
      [row(stale), row(earlierToday), row(recent)],
      { ...DEFAULT_SIDEBAR_VIEW, groupBy: "updated" },
      { now, parentOf: () => null, statusOf: () => "idle" },
    );
    expect(groups.map((group) => group.label)).toEqual(["Today", "Last 30 days"]);
    expect(groups.find((group) => group.label === "Today")?.rows.map((item) => item.thread.id))
      .toEqual(["recent", "earlier"]);
  });

  it("keeps the selected family past a group's first page", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      row(thread(`thread-${index}`, now - index * 60_000)));
    const page = pageGroupRows(rows, () => null, {
      activeThreadId: "thread-11",
      limit: 10,
    });
    expect(page.shown.map((item) => item.thread.id)).toEqual([
      ...rows.slice(0, 10).map((item) => item.thread.id),
      "thread-11",
    ]);
    expect(page.hiddenConversations).toBe(1);
  });

  it("moves a family together when its child has the newest activity", () => {
    const older = thread("older", now - 3_600_000);
    const parent = thread("parent", now - day);
    const child = thread("child", now - 60_000, now - 60_000, "parent");
    const groups = groupOrdinaryRows(
      [row(older), row(parent), row(child)],
      { ...DEFAULT_SIDEBAR_VIEW, groupBy: "updated" },
      {
        now,
        parentOf: (id) => id === "child" ? "parent" : null,
        statusOf: () => "idle",
      },
    );
    expect(groups[0]?.rows.map((item) => item.thread.id)).toEqual([
      "parent", "child", "older",
    ]);
  });
});
