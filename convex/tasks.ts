import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("active"),
        v.literal("backlog"),
        v.literal("done"),
        v.literal("someday"),
      ),
    ),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tasks: Doc<"tasks">[] = [];

    if (args.status) {
      const status = args.status;
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }

    if (args.tag) {
      const tag = args.tag;
      tasks = tasks.filter((t) => t.tags.includes(tag));
    }

    tasks.sort((a, b) => b.createdAt - a.createdAt);
    return tasks;
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("active"),
        v.literal("backlog"),
        v.literal("done"),
        v.literal("someday"),
      ),
    ),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    promisedEta: v.optional(v.string()),
    realisticEta: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    log: v.optional(v.array(v.object({ timestamp: v.number(), entry: v.string() }))),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      status: args.status ?? "inbox",
      createdAt: Date.now(),
      startDate: args.startDate,
      dueDate: args.dueDate,
      followUpDate: args.followUpDate,
      promisedEta: args.promisedEta,
      realisticEta: args.realisticEta,
      tags: args.tags ?? [],
      notes: args.notes ?? "",
      log: args.log ?? [],
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.fire, {
      event: "task.created",
      data: { id: taskId, title: args.title },
    });
    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("active"),
        v.literal("backlog"),
        v.literal("done"),
        v.literal("someday"),
      ),
    ),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    followUpDate: v.optional(v.string()),
    promisedEta: v.optional(v.string()),
    realisticEta: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
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
    await ctx.scheduler.runAfter(0, internal.webhooks.fire, {
      event: "task.updated",
      data: { id, ...updates },
    });
    return id;
  },
});

export const move = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("active"),
      v.literal("backlog"),
      v.literal("done"),
      v.literal("someday"),
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const logEntry = {
      timestamp: Date.now(),
      entry: `Moved to ${args.status}`,
    };

    await ctx.db.patch(args.id, {
      status: args.status,
      log: [...task.log, logEntry],
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.fire, {
      event: "task.moved",
      data: { id: args.id, status: args.status },
    });
    return args.id;
  },
});

export const addLog = mutation({
  args: {
    id: v.id("tasks"),
    entry: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const logEntry = {
      timestamp: Date.now(),
      entry: args.entry,
    };

    await ctx.db.patch(args.id, {
      log: [...task.log, logEntry],
    });
    return args.id;
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const titleResults = await ctx.db
      .query("tasks")
      .withSearchIndex("search_title_notes", (q) => q.search("title", args.query))
      .collect();

    const notesResults = await ctx.db
      .query("tasks")
      .withSearchIndex("search_notes", (q) => q.search("notes", args.query))
      .collect();

    // Merge and deduplicate by _id
    const seen = new Set<string>();
    const merged = [];
    for (const task of [...titleResults, ...notesResults]) {
      if (!seen.has(task._id)) {
        seen.add(task._id);
        merged.push(task);
      }
    }
    return merged;
  },
});

export const byPerson = query({
  args: { person: v.string() },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const personLower = args.person.toLowerCase();

    // Match p-name tags (e.g., p-alleha, p-dan)
    return allTasks.filter((t) => {
      return t.tags.some((tag) => {
        if (!tag.startsWith("p-")) return false;
        return tag.toLowerCase().includes(personLower);
      });
    });
  },
});

export const overdue = query({
  args: {},
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const today = new Date().toISOString().split("T")[0];

    return allTasks.filter((t) => {
      if (t.status === "done") return false;
      const duePast = t.dueDate && t.dueDate < today;
      const followUpPast = t.followUpDate && t.followUpDate < today;
      return duePast || followUpPast;
    });
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const today = new Date().toISOString().split("T")[0];

    let inbox = 0;
    let active = 0;
    let backlog = 0;
    let done = 0;
    let someday = 0;
    let overdue = 0;

    for (const t of allTasks) {
      switch (t.status) {
        case "inbox":
          inbox++;
          break;
        case "active":
          active++;
          break;
        case "backlog":
          backlog++;
          break;
        case "done":
          done++;
          break;
        case "someday":
          someday++;
          break;
      }

      if (t.status !== "done") {
        const duePast = t.dueDate && t.dueDate < today;
        const followUpPast = t.followUpDate && t.followUpDate < today;
        if (duePast || followUpPast) {
          overdue++;
        }
      }
    }

    return {
      inbox,
      active,
      backlog,
      done,
      someday,
      overdue,
      total: allTasks.length,
    };
  },
});
