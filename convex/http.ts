import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// ---------- helpers ----------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const key = (process as any).env.MIRA_API_KEY as string | undefined;
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
    const owner = url.searchParams.get("owner") ?? undefined;

    const tasks = await ctx.runQuery(api.tasks.list, {
      status: status || undefined,
      tag,
      owner,
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
      status: body.status as
        | "inbox"
        | "active"
        | "backlog"
        | "done"
        | "someday"
        | undefined,
      owner: body.owner as string | undefined,
      waitingOn: body.waitingOn as string | undefined,
      agenda: body.agenda as string | undefined,
      startDate: body.startDate as string | undefined,
      dueDate: body.dueDate as string | undefined,
      followUpDate: body.followUpDate as string | undefined,
      promisedEta: body.promisedEta as string | undefined,
      realisticEta: body.realisticEta as string | undefined,
      tags: body.tags as string[] | undefined,
      notes: body.notes as string | undefined,
      log: body.log as Array<{ timestamp: number; entry: string }> | undefined,
      source: body.source as string | undefined,
      clientName: body.clientName as string | undefined,
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
      status: body.status as
        | "inbox"
        | "active"
        | "backlog"
        | "done"
        | "someday"
        | undefined,
      owner: body.owner as string | undefined,
      waitingOn: body.waitingOn as string | undefined,
      agenda: body.agenda as string | undefined,
      startDate: body.startDate as string | undefined,
      dueDate: body.dueDate as string | undefined,
      followUpDate: body.followUpDate as string | undefined,
      promisedEta: body.promisedEta as string | undefined,
      realisticEta: body.realisticEta as string | undefined,
      tags: body.tags as string[] | undefined,
      notes: body.notes as string | undefined,
      source: body.source as string | undefined,
      clientName: body.clientName as string | undefined,
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
      return error(
        `status must be one of: ${validStatuses.join(", ")}`,
        400
      );
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

export default http;
