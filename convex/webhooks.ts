import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";

// --- Internal: list enabled webhooks matching an event ---

export const listEnabled = internalQuery({
  args: { event: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("webhooks").collect();
    return all.filter((w) => w.enabled && w.events.includes(args.event));
  },
});

// --- Internal action: fire webhook HTTP POSTs ---

export const fire = internalAction({
  args: { event: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    const webhooks = await ctx.runQuery(internal.webhooks.listEnabled, {
      event: args.event,
    });

    for (const wh of webhooks) {
      try {
        const payload = JSON.stringify({
          event: args.event,
          data: args.data,
          timestamp: Date.now(),
        });

        // HMAC-SHA256 signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(wh.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
        const signature = Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
          },
          body: payload,
        });
      } catch {
        // Fire-and-forget: log but don't fail
        console.error(`Webhook POST to ${wh.url} failed for event ${args.event}`);
      }
    }
  },
});

// --- CRUD: public mutations/queries for webhook management ---

export const createWebhook = mutation({
  args: {
    url: v.string(),
    secret: v.string(),
    events: v.array(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("webhooks", {
      url: args.url,
      secret: args.secret,
      events: args.events,
      enabled: args.enabled ?? true,
    });
    return id;
  },
});

export const listWebhooks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("webhooks").collect();
  },
});

export const deleteWebhook = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
