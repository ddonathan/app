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
    projectId: v.optional(v.id("projects")),
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
    .index("by_followUpDate", ["followUpDate"])
    .index("by_project", ["projectId"]),
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("on-hold"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    owner: v.optional(v.string()),
    client: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_client", ["client"]),
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
  workouts: defineTable({
    date: v.string(),
    workout: v.optional(
      v.object({
        mainLift: v.optional(v.string()),
        topWeight: v.optional(v.float64()),
        felt: v.optional(v.string()),
        nextWeight: v.optional(v.float64()),
        startTime: v.optional(v.string()),
        sets: v.optional(
          v.array(
            v.object({
              exercise: v.string(),
              reps: v.union(v.float64(), v.string()),
              weight: v.union(v.float64(), v.string()),
            }),
          ),
        ),
        accessories: v.optional(
          v.array(
            v.object({
              exercise: v.string(),
              reps: v.union(v.float64(), v.string()),
              weight: v.union(v.float64(), v.string()),
              sets: v.optional(v.float64()),
            }),
          ),
        ),
        finishers: v.optional(
          v.array(
            v.object({
              exercise: v.string(),
              reps: v.union(v.float64(), v.string()),
              weight: v.union(v.float64(), v.string()),
              sets: v.optional(v.float64()),
            }),
          ),
        ),
      }),
    ),
    notes: v.optional(v.string()),
  }).index("by_date", ["date"]),
  bodycomp: defineTable({
    date: v.string(),
    weight: v.optional(v.float64()),
    bf: v.optional(v.float64()),
    smm: v.optional(v.float64()),
    lbm: v.optional(v.float64()),
    bfm: v.optional(v.float64()),
    bmi: v.optional(v.float64()),
    score: v.optional(v.float64()),
    measurements: v.optional(
      v.object({
        waist: v.optional(v.float64()),
        chest: v.optional(v.float64()),
        arms: v.optional(v.float64()),
        thighs: v.optional(v.float64()),
      }),
    ),
    photos: v.optional(v.array(v.any())),
    notes: v.optional(v.string()),
    time: v.optional(v.string()),
  }).index("by_date", ["date"]),
  triage: defineTable({
    sourceId: v.string(),
    source: v.string(),
    from: v.string(),
    fromEmail: v.optional(v.string()),
    subject: v.string(),
    bodyPreview: v.string(),
    receivedAt: v.number(),
    importance: v.optional(v.string()),
    hasAttachments: v.optional(v.boolean()),
    conversationId: v.optional(v.string()),
    priority: v.string(),
    category: v.optional(v.string()),
    summary: v.string(),
    suggestedAction: v.optional(v.string()),
    draftReply: v.optional(v.string()),
    status: v.string(),
    actedAt: v.optional(v.number()),
    actedAction: v.optional(v.string()),
    snoozeUntil: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sourceId", ["sourceId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_receivedAt", ["receivedAt"])
    .index("by_source_status", ["source", "status"]),
  bloodlabs: defineTable({
    drawDate: v.string(),
    markerName: v.string(),
    markerDescription: v.optional(v.string()),
    value: v.float64(),
    units: v.optional(v.string()),
    referenceRange: v.optional(v.string()),
    source: v.optional(v.string()),
  })
    .index("by_date", ["drawDate"])
    .index("by_marker", ["markerName", "drawDate"]),
  triageMetrics: defineTable({
    triageId: v.id("triage"),
    sourceId: v.string(),
    recommendedAction: v.string(),
    actualAction: v.string(),
    actionAgreed: v.boolean(),
    draftProvided: v.boolean(),
    draftAcceptedAsIs: v.optional(v.boolean()),
    draftEditDistance: v.optional(v.number()),
    originalDraft: v.optional(v.string()),
    finalDraft: v.optional(v.string()),
    actedAt: v.number(),
  })
    .index("by_actedAt", ["actedAt"])
    .index("by_triageId", ["triageId"]),
});
