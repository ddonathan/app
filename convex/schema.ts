import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  tasks: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("active"),
      v.literal("backlog"),
      v.literal("done"),
      v.literal("someday"),
    ),
    createdAt: v.number(),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    promisedEta: v.optional(v.string()),
    realisticEta: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.string(),
    log: v.array(v.object({ timestamp: v.number(), entry: v.string() })),
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
    .index("by_tags", ["tags"])
    .index("by_dueDate", ["dueDate"])
    .index("by_followUpDate", ["followUpDate"]),
  webhooks: defineTable({
    url: v.string(),
    secret: v.string(),
    events: v.array(v.string()),
    enabled: v.boolean(),
  }),
  tags: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("context"),
      v.literal("person"),
      v.literal("client"),
      v.literal("project"),
      v.literal("priority"),
      v.literal("owner"),
      v.literal("source"),
      v.literal("other"),
    ),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    timeRule: v.optional(
      v.object({
        hours: v.optional(v.array(v.number())),
        days: v.optional(v.array(v.string())),
      }),
    ),
    archived: v.optional(v.boolean()),
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"]),
});
