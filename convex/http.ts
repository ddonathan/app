/// <reference path="env.d.ts" />
import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// ---------- Convex Auth routes ----------
auth.addHttpRoutes(http);

// ---------- helpers ----------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

function authorize(request: Request): boolean {
  const key = process.env.MIRA_API_KEY;
  if (!key) return false;
  const header = request.headers.get("Authorization");
  return header === `Bearer ${key}`;
}

// ---------- CORS preflight ----------

http.route({
  path: "/api/tasks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/tasks/move",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/tasks/log",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/tasks/batch",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/stats",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------- GET /api/tasks ----------

http.route({
  path: "/api/tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const url = new URL(request.url);
    const status = url.searchParams.get("status") as
      | "inbox"
      | "active"
      | "backlog"
      | "done"
      | "someday"
      | undefined;
    const tag = url.searchParams.get("tag") ?? undefined;

    const tasks = await ctx.runQuery(api.tasks.list, {
      status: status || undefined,
      tag,
    });
    return json(tasks);
  }),
});

// ---------- POST /api/tasks ----------

http.route({
  path: "/api/tasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.title || typeof body.title !== "string") {
      return error("title is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tasks.create, {
      title: body.title as string,
      status: body.status as "inbox" | "active" | "backlog" | "done" | "someday" | undefined,
      startDate: body.startDate as string | undefined,
      dueDate: body.dueDate as string | undefined,
      followUpDate: body.followUpDate as string | undefined,
      promisedEta: body.promisedEta as string | undefined,
      realisticEta: body.realisticEta as string | undefined,
      tags: body.tags as string[] | undefined,
      notes: body.notes as string | undefined,
      log: body.log as Array<{ timestamp: number; entry: string }> | undefined,
    });

    return json({ id }, 201);
  }),
});

// ---------- POST /api/tasks/batch ----------

http.route({
  path: "/api/tasks/batch",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!Array.isArray(body.tasks)) {
      return error("tasks is required and must be an array", 400);
    }

    // Validate each task has a title
    for (const task of body.tasks) {
      if (!task.title || typeof task.title !== "string") {
        return error("Each task must have a title string", 400);
      }
    }

    const ids = await ctx.runMutation(api.tasks.batchCreate, {
      tasks: body.tasks as Array<{
        title: string;
        status?: "inbox" | "active" | "backlog" | "done" | "someday";
        startDate?: string;
        dueDate?: string;
        followUpDate?: string;
        promisedEta?: string;
        realisticEta?: string;
        tags?: string[];
        notes?: string;
        log?: Array<{ timestamp: number; entry: string }>;
      }>,
    });

    return json({ ids }, 201);
  }),
});

// ---------- PATCH /api/tasks ----------

http.route({
  path: "/api/tasks",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tasks.update, {
      id: body.id as Id<"tasks">,
      title: body.title as string | undefined,
      status: body.status as "inbox" | "active" | "backlog" | "done" | "someday" | undefined,
      startDate: body.startDate as string | undefined,
      dueDate: body.dueDate as string | undefined,
      followUpDate: body.followUpDate as string | undefined,
      promisedEta: body.promisedEta as string | undefined,
      realisticEta: body.realisticEta as string | undefined,
      tags: body.tags as string[] | undefined,
      notes: body.notes as string | undefined,
    });

    return json({ id });
  }),
});

// ---------- POST /api/tasks/move ----------

http.route({
  path: "/api/tasks/move",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }
    if (!body.status || typeof body.status !== "string") {
      return error("status is required and must be a string", 400);
    }

    const validStatuses = ["inbox", "active", "backlog", "done", "someday"];
    if (!validStatuses.includes(body.status as string)) {
      return error(`status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const id = await ctx.runMutation(api.tasks.move, {
      id: body.id as Id<"tasks">,
      status: body.status as "inbox" | "active" | "backlog" | "done" | "someday",
    });

    return json({ id });
  }),
});

// ---------- POST /api/tasks/log ----------

http.route({
  path: "/api/tasks/log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }
    if (!body.entry || typeof body.entry !== "string") {
      return error("entry is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tasks.addLog, {
      id: body.id as Id<"tasks">,
      entry: body.entry as string,
    });

    return json({ id });
  }),
});

// ---------- GET /api/stats ----------

http.route({
  path: "/api/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const stats = await ctx.runQuery(api.tasks.stats, {});
    return json(stats);
  }),
});

// ---------- DELETE /api/tasks ----------

http.route({
  path: "/api/tasks",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tasks.remove, {
      id: body.id as Id<"tasks">,
    });
    return json({ id, deleted: true });
  }),
});

// ---------- CORS preflight for webhooks ----------

http.route({
  path: "/api/webhooks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------- POST /api/webhooks ----------

http.route({
  path: "/api/webhooks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.url || typeof body.url !== "string") {
      return error("url is required and must be a string", 400);
    }
    if (!body.secret || typeof body.secret !== "string") {
      return error("secret is required and must be a string", 400);
    }
    if (!Array.isArray(body.events)) {
      return error("events is required and must be an array of strings", 400);
    }

    const id = await ctx.runMutation(api.webhooks.createWebhook, {
      url: body.url as string,
      secret: body.secret as string,
      events: body.events as string[],
      enabled: body.enabled as boolean | undefined,
    });

    return json({ id }, 201);
  }),
});

// ---------- GET /api/webhooks ----------

http.route({
  path: "/api/webhooks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const webhooks = await ctx.runQuery(api.webhooks.listWebhooks, {});
    return json(webhooks);
  }),
});

// ---------- DELETE /api/webhooks ----------

http.route({
  path: "/api/webhooks",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.webhooks.deleteWebhook, {
      id: body.id as Id<"webhooks">,
    });

    return json({ id });
  }),
});

// ---------- CORS preflight for tags ----------

http.route({
  path: "/api/tags",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------- GET /api/tags ----------

http.route({
  path: "/api/tags",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") as
      | "context"
      | "person"
      | "client"
      | "project"
      | "priority"
      | "owner"
      | "source"
      | "other"
      | undefined;
    const includeArchived = url.searchParams.get("includeArchived") === "true" || undefined;

    const tags = await ctx.runQuery(api.tags.list, {
      type: type || undefined,
      includeArchived,
    });
    return json(tags);
  }),
});

// ---------- POST /api/tags ----------

http.route({
  path: "/api/tags",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.name || typeof body.name !== "string") {
      return error("name is required and must be a string", 400);
    }
    if (!body.type || typeof body.type !== "string") {
      return error("type is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tags.create, {
      name: body.name as string,
      type: body.type as
        | "context"
        | "person"
        | "client"
        | "project"
        | "priority"
        | "owner"
        | "source"
        | "other",
      color: body.color as string | undefined,
      description: body.description as string | undefined,
      timeRule: body.timeRule as { hours?: number[]; days?: string[] } | undefined,
      archived: body.archived as boolean | undefined,
    });

    return json({ id }, 201);
  }),
});

// ---------- PATCH /api/tags ----------

http.route({
  path: "/api/tags",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tags.update, {
      id: body.id as Id<"tags">,
      name: body.name as string | undefined,
      type: body.type as
        | "context"
        | "person"
        | "client"
        | "project"
        | "priority"
        | "owner"
        | "source"
        | "other"
        | undefined,
      color: body.color as string | undefined,
      description: body.description as string | undefined,
      timeRule: body.timeRule as { hours?: number[]; days?: string[] } | undefined,
      archived: body.archived as boolean | undefined,
    });

    return json({ id });
  }),
});

// ---------- DELETE /api/tags ----------

http.route({
  path: "/api/tags",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.tags.remove, {
      id: body.id as Id<"tags">,
    });
    return json({ id, deleted: true });
  }),
});

// ---------- CORS preflight for workouts ----------

http.route({
  path: "/api/workouts",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/workouts/stats",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------- GET /api/workouts ----------

http.route({
  path: "/api/workouts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const url = new URL(request.url);
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? Number(limitStr) : undefined;

    const workouts = await ctx.runQuery(api.workouts.list, { limit });
    return json(workouts);
  }),
});

// ---------- POST /api/workouts ----------

http.route({
  path: "/api/workouts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.date || typeof body.date !== "string") {
      return error("date is required and must be a string", 400);
    }
    // biome-ignore lint/suspicious/noExplicitAny: flexible workout shape from API
    const workout = body.workout as any;

    const id = await ctx.runMutation(api.workouts.create, {
      date: body.date as string,
      workout:
        workout && typeof workout === "object"
          ? {
              mainLift: workout.mainLift,
              topWeight: workout.topWeight,
              felt: workout.felt,
              nextWeight: workout.nextWeight,
              startTime: workout.startTime,
              sets: workout.sets,
              accessories: workout.accessories,
              finishers: workout.finishers,
            }
          : undefined,
      notes: body.notes as string | undefined,
    });

    return json({ id }, 201);
  }),
});

// ---------- PATCH /api/workouts ----------

http.route({
  path: "/api/workouts",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.workouts.update, {
      id: body.id as Id<"workouts">,
      date: body.date as string | undefined,
      workout: body.workout as
        | {
            mainLift: string;
            topWeight: number;
            felt: string;
            nextWeight: number;
            sets: Array<{ exercise: string; reps: number | string; weight: number | string }>;
            accessories?: Array<{
              exercise: string;
              reps: number | string;
              weight: number | string;
              sets?: number;
            }>;
            finishers?: Array<{
              exercise: string;
              reps: number | string;
              weight: number | string;
              sets?: number;
            }>;
          }
        | undefined,
      notes: body.notes as string | undefined,
    });

    return json({ id });
  }),
});

// ---------- DELETE /api/workouts ----------

http.route({
  path: "/api/workouts",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.workouts.remove, {
      id: body.id as Id<"workouts">,
    });
    return json({ id, deleted: true });
  }),
});

// ---------- GET /api/workouts/stats ----------

http.route({
  path: "/api/workouts/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const stats = await ctx.runQuery(api.workouts.stats, {});
    return json(stats);
  }),
});

// ---------- CORS preflight for bodycomp ----------

http.route({
  path: "/api/bodycomp",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/bodycomp/stats",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------- GET /api/bodycomp ----------

http.route({
  path: "/api/bodycomp",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const url = new URL(request.url);
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? Number(limitStr) : undefined;

    const entries = await ctx.runQuery(api.bodycomp.list, { limit });
    return json(entries);
  }),
});

// ---------- POST /api/bodycomp ----------

http.route({
  path: "/api/bodycomp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.date || typeof body.date !== "string") {
      return error("date is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.bodycomp.create, {
      date: body.date as string,
      weight: body.weight as number | undefined,
      bf: body.bf as number | undefined,
      smm: body.smm as number | undefined,
      lbm: body.lbm as number | undefined,
      bfm: body.bfm as number | undefined,
      bmi: body.bmi as number | undefined,
      score: body.score as number | undefined,
      measurements: body.measurements as
        | {
            waist?: number;
            chest?: number;
            arms?: number;
            thighs?: number;
          }
        | undefined,
      photos: body.photos as string[] | undefined,
      notes: body.notes as string | undefined,
      time: body.time as string | undefined,
    });

    return json({ id }, 201);
  }),
});

// ---------- PATCH /api/bodycomp ----------

http.route({
  path: "/api/bodycomp",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.bodycomp.update, {
      id: body.id as Id<"bodycomp">,
      date: body.date as string | undefined,
      weight: body.weight as number | undefined,
      bf: body.bf as number | undefined,
      smm: body.smm as number | undefined,
      lbm: body.lbm as number | undefined,
      bfm: body.bfm as number | undefined,
      bmi: body.bmi as number | undefined,
      score: body.score as number | undefined,
      measurements: body.measurements as
        | {
            waist?: number;
            chest?: number;
            arms?: number;
            thighs?: number;
          }
        | undefined,
      photos: body.photos as string[] | undefined,
      notes: body.notes as string | undefined,
      time: body.time as string | undefined,
    });

    return json({ id });
  }),
});

// ---------- DELETE /api/bodycomp ----------

http.route({
  path: "/api/bodycomp",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.bodycomp.remove, {
      id: body.id as Id<"bodycomp">,
    });
    return json({ id, deleted: true });
  }),
});

// ---------- GET /api/bodycomp/stats ----------

http.route({
  path: "/api/bodycomp/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const stats = await ctx.runQuery(api.bodycomp.stats, {});
    return json(stats);
  }),
});

// ---------- CORS preflight for bloodlabs ----------

http.route({
  path: "/api/bloodlabs",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/bloodlabs/batch",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/bloodlabs/markers",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/bloodlabs/stats",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------- GET /api/bloodlabs ----------

http.route({
  path: "/api/bloodlabs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const url = new URL(request.url);
    const marker = url.searchParams.get("marker") ?? undefined;
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;

    const entries = await ctx.runQuery(api.bloodlabs.list, {
      markerName: marker,
      from,
      to,
    });
    return json(entries);
  }),
});

// ---------- POST /api/bloodlabs ----------

http.route({
  path: "/api/bloodlabs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.drawDate || typeof body.drawDate !== "string") {
      return error("drawDate is required and must be a string", 400);
    }
    if (!body.markerName || typeof body.markerName !== "string") {
      return error("markerName is required and must be a string", 400);
    }
    if (body.value === undefined || typeof body.value !== "number") {
      return error("value is required and must be a number", 400);
    }

    const id = await ctx.runMutation(api.bloodlabs.create, {
      drawDate: body.drawDate as string,
      markerName: body.markerName as string,
      markerDescription: body.markerDescription as string | undefined,
      value: body.value as number,
      units: body.units as string | undefined,
      referenceRange: body.referenceRange as string | undefined,
      source: body.source as string | undefined,
    });

    return json({ id }, 201);
  }),
});

// ---------- POST /api/bloodlabs/batch ----------

http.route({
  path: "/api/bloodlabs/batch",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!Array.isArray(body.entries)) {
      return error("entries is required and must be an array", 400);
    }

    for (const entry of body.entries) {
      if (!entry.drawDate || typeof entry.drawDate !== "string") {
        return error("Each entry must have a drawDate string", 400);
      }
      if (!entry.markerName || typeof entry.markerName !== "string") {
        return error("Each entry must have a markerName string", 400);
      }
      if (entry.value === undefined || typeof entry.value !== "number") {
        return error("Each entry must have a value number", 400);
      }
    }

    const ids = await ctx.runMutation(api.bloodlabs.batchCreate, {
      entries: body.entries as Array<{
        drawDate: string;
        markerName: string;
        markerDescription?: string;
        value: number;
        units?: string;
        referenceRange?: string;
        source?: string;
      }>,
    });

    return json({ ids }, 201);
  }),
});

// ---------- DELETE /api/bloodlabs ----------

http.route({
  path: "/api/bloodlabs",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }

    if (!body.id || typeof body.id !== "string") {
      return error("id is required and must be a string", 400);
    }

    const id = await ctx.runMutation(api.bloodlabs.remove, {
      id: body.id as Id<"bloodlabs">,
    });
    return json({ id, deleted: true });
  }),
});

// ---------- GET /api/bloodlabs/markers ----------

http.route({
  path: "/api/bloodlabs/markers",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const markers = await ctx.runQuery(api.bloodlabs.markers, {});
    return json(markers);
  }),
});

// ---------- GET /api/bloodlabs/stats ----------

http.route({
  path: "/api/bloodlabs/stats",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorize(request)) return error("Unauthorized", 401);

    const stats = await ctx.runQuery(api.bloodlabs.stats, {});
    return json(stats);
  }),
});

export default http;
