import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const projectStatusValidator = v.union(
  v.literal("active"),
  v.literal("on-hold"),
  v.literal("completed"),
  v.literal("archived"),
);

export const list = query({
  args: {
    status: v.optional(projectStatusValidator),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let projects: Doc<"projects">[];

    if (args.status) {
      const status = args.status;
      projects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      projects = await ctx.db.query("projects").collect();
    }

    // Exclude archived by default unless explicitly requested
    if (!args.includeArchived && !args.status) {
      projects = projects.filter((p) => p.status !== "archived");
    }

    projects.sort((a, b) => b.createdAt - a.createdAt);
    return projects;
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(projectStatusValidator),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    owner: v.optional(v.string()),
    client: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      status: args.status ?? "active",
      color: args.color,
      dueDate: args.dueDate,
      startDate: args.startDate,
      owner: args.owner,
      client: args.client,
      createdAt: Date.now(),
    });
    return projectId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(projectStatusValidator),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    startDate: v.optional(v.string()),
    owner: v.optional(v.string()),
    client: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
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
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    // Unlink all tasks from this project
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, { projectId: undefined });
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const stats = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    let inbox = 0;
    let active = 0;
    let backlog = 0;
    let done = 0;
    let someday = 0;
    let overdue = 0;

    for (const t of tasks) {
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

    const total = tasks.length;
    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      inbox,
      active,
      backlog,
      done,
      someday,
      overdue,
      total,
      completionPct,
    };
  },
});

export const withTasks = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    tasks.sort((a, b) => b.createdAt - a.createdAt);

    return { ...project, tasks };
  },
});
