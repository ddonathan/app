import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    priority: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const status = args.status ?? "pending";
    let items: Doc<"triage">[];

    if (args.source) {
      items = await ctx.db
        .query("triage")
        .withIndex("by_source_status", (q) => q.eq("source", args.source!).eq("status", status))
        .collect();
    } else {
      items = await ctx.db
        .query("triage")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }

    if (args.priority) {
      const p = args.priority;
      items = items.filter((i) => i.priority === p);
    }

    const priorityOrder: Record<string, number> = { urgent: 0, action: 1, fyi: 2, low: 3 };
    items.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 9;
      const pb = priorityOrder[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.receivedAt - a.receivedAt;
    });

    if (args.limit) {
      items = items.slice(0, args.limit);
    }

    return items;
  },
});

export const upsert = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("triage")
      .withIndex("by_sourceId", (q) => q.eq("sourceId", args.sourceId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("triage", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const batchUpsert = mutation({
  args: {
    items: v.array(
      v.object({
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
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    const now = Date.now();

    for (const item of args.items) {
      const existing = await ctx.db
        .query("triage")
        .withIndex("by_sourceId", (q) => q.eq("sourceId", item.sourceId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...item, updatedAt: now });
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert("triage", {
          ...item,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
        ids.push(id);
      }
    }

    return ids;
  },
});

export const act = mutation({
  args: {
    id: v.id("triage"),
    action: v.string(),
    snoozeUntil: v.optional(v.number()),
    editedDraft: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Triage item not found");

    const now = Date.now();
    const status = args.action === "snooze" ? "snoozed" : "acted";

    // Determine final draft
    const finalDraft = args.editedDraft ?? item.draftReply;

    await ctx.db.patch(args.id, {
      status,
      actedAt: now,
      actedAction: args.action,
      snoozeUntil: args.snoozeUntil,
      updatedAt: now,
    });

    // Log metrics
    const draftProvided = !!item.draftReply;
    let draftAcceptedAsIs: boolean | undefined;
    let draftEditDistance: number | undefined;

    if (draftProvided && args.action === "reply") {
      draftAcceptedAsIs = !args.editedDraft || args.editedDraft === item.draftReply;
      if (!draftAcceptedAsIs && args.editedDraft && item.draftReply) {
        // Simple edit distance: character-level difference ratio
        const orig = item.draftReply;
        const edited = args.editedDraft;
        const maxLen = Math.max(orig.length, edited.length);
        let diffs = 0;
        for (let i = 0; i < maxLen; i++) {
          if (orig[i] !== edited[i]) diffs++;
        }
        draftEditDistance = Math.round((diffs / maxLen) * 100);
      }
    }

    await ctx.db.insert("triageMetrics", {
      triageId: args.id,
      sourceId: item.sourceId,
      recommendedAction: item.suggestedAction ?? "unknown",
      actualAction: args.action,
      actionAgreed: (item.suggestedAction ?? "unknown") === args.action,
      draftProvided,
      draftAcceptedAsIs,
      draftEditDistance,
      originalDraft: draftProvided ? item.draftReply : undefined,
      finalDraft: args.action === "reply" ? finalDraft : undefined,
      actedAt: now,
    });

    return {
      id: args.id,
      sourceId: item.sourceId,
      source: item.source,
      action: args.action,
      draftReply: finalDraft,
      fromEmail: item.fromEmail,
      subject: item.subject,
    };
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("triage").collect();

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      if (item.status === "pending") {
        byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
      }
    }

    return { byStatus, byPriority, total: all.length };
  },
});

export const metrics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.days ?? 30) * 24 * 60 * 60 * 1000;
    const all = await ctx.db
      .query("triageMetrics")
      .withIndex("by_actedAt", (q) => q.gte("actedAt", since))
      .collect();

    const total = all.length;
    if (total === 0) return { total: 0, actionAgreementRate: 0, draftAcceptanceRate: 0, avgEditDistance: 0 };

    const agreed = all.filter((m) => m.actionAgreed).length;
    const withDraft = all.filter((m) => m.draftProvided);
    const acceptedAsIs = withDraft.filter((m) => m.draftAcceptedAsIs === true).length;
    const editDistances = all.filter((m) => m.draftEditDistance !== undefined).map((m) => m.draftEditDistance!);
    const avgEditDistance = editDistances.length > 0 ? Math.round(editDistances.reduce((a, b) => a + b, 0) / editDistances.length) : 0;

    return {
      total,
      actionAgreementRate: Math.round((agreed / total) * 100),
      draftAcceptanceRate: withDraft.length > 0 ? Math.round((acceptedAsIs / withDraft.length) * 100) : 0,
      avgEditDistance,
      breakdown: {
        totalActions: total,
        actionsAgreed: agreed,
        draftsProvided: withDraft.length,
        draftsAcceptedAsIs: acceptedAsIs,
        draftsEdited: withDraft.length - acceptedAsIs,
      },
    };
  },
});

export const remove = mutation({
  args: { id: v.id("triage") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
