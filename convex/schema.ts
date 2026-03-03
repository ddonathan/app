import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("active"),
      v.literal("backlog"),
      v.literal("done"),
      v.literal("someday"),
    ),
    owner: v.string(),
    waitingOn: v.optional(v.string()),
    agenda: v.optional(v.string()),
    createdAt: v.number(),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    promisedEta: v.optional(v.string()),
    realisticEta: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.string(),
    log: v.array(v.object({ timestamp: v.number(), entry: v.string() })),
    source: v.optional(v.string()),
    clientName: v.optional(v.string()),
  })
    .searchIndex("search_title_notes", {
      searchField: "title",
      filterFields: ["status"],
    })
    .searchIndex("search_notes", {
      searchField: "notes",
      filterFields: ["status"],
    })
    .index("by_status", ["status"])
    .index("by_owner", ["owner"])
    .index("by_tags", ["tags"])
    .index("by_dueDate", ["dueDate"])
    .index("by_followUpDate", ["followUpDate"]),
});
