/// <reference path="env.d.ts" />
import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

const http = httpRouter();

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

export default http;
