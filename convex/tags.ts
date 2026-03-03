import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const tagType = v.union(
  v.literal("context"),
  v.literal("person"),
  v.literal("client"),
  v.literal("project"),
  v.literal("priority"),
  v.literal("owner"),
  v.literal("source"),
  v.literal("other"),
);

export const list = query({
  args: {
    type: v.optional(tagType),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tags: Doc<"tags">[];

    if (args.type) {
      const type = args.type;
      tags = await ctx.db
        .query("tags")
        .withIndex("by_type", (q) => q.eq("type", type))
        .collect();
    } else {
      tags = await ctx.db.query("tags").collect();
    }

    if (!args.includeArchived) {
      tags = tags.filter((t) => !t.archived);
    }

    tags.sort((a, b) => a.name.localeCompare(b.name));
    return tags;
  },
});

export const get = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: tagType,
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    timeRule: v.optional(
      v.object({
        hours: v.optional(v.array(v.number())),
        days: v.optional(v.array(v.string())),
      }),
    ),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tags", {
      name: args.name,
      type: args.type,
      color: args.color,
      description: args.description,
      timeRule: args.timeRule,
      archived: args.archived,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    type: v.optional(tagType),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    timeRule: v.optional(
      v.object({
        hours: v.optional(v.array(v.number())),
        days: v.optional(v.array(v.string())),
      }),
    ),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // Filter out undefined values so we only patch what was provided
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id);
    if (!tag) throw new Error("Tag not found");
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const byName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const tag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    return tag ?? null;
  },
});

export const usageCount = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const count = allTasks.filter((t) => t.tags.includes(args.name)).length;
    return { count };
  },
});
