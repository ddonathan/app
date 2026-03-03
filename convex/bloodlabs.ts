import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    markerName: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db.query("bloodlabs").collect();
    let filtered = entries;

    if (args.markerName) {
      filtered = filtered.filter((e) => e.markerName === args.markerName);
    }
    if (args.from) {
      const from = args.from;
      filtered = filtered.filter((e) => e.drawDate >= from);
    }
    if (args.to) {
      const to = args.to;
      filtered = filtered.filter((e) => e.drawDate <= to);
    }

    filtered.sort((a, b) => (b.drawDate > a.drawDate ? 1 : b.drawDate < a.drawDate ? -1 : 0));
    return filtered;
  },
});

export const markers = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("bloodlabs").collect();

    // Group by markerName, keep the latest entry per marker
    const markerMap = new Map<
      string,
      { markerName: string; value: number; units?: string; drawDate: string }
    >();

    for (const entry of entries) {
      const existing = markerMap.get(entry.markerName);
      if (!existing || entry.drawDate > existing.drawDate) {
        markerMap.set(entry.markerName, {
          markerName: entry.markerName,
          value: entry.value,
          units: entry.units,
          drawDate: entry.drawDate,
        });
      }
    }

    const result = [...markerMap.values()];
    result.sort((a, b) => (a.markerName > b.markerName ? 1 : a.markerName < b.markerName ? -1 : 0));
    return result;
  },
});

export const byMarker = query({
  args: {
    markerName: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("bloodlabs")
      .withIndex("by_marker", (q) => q.eq("markerName", args.markerName))
      .collect();

    // Sort by drawDate ascending for charting
    entries.sort((a, b) => (a.drawDate > b.drawDate ? 1 : a.drawDate < b.drawDate ? -1 : 0));
    return entries;
  },
});

export const create = mutation({
  args: {
    drawDate: v.string(),
    markerName: v.string(),
    markerDescription: v.optional(v.string()),
    value: v.float64(),
    units: v.optional(v.string()),
    referenceRange: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("bloodlabs", {
      drawDate: args.drawDate,
      markerName: args.markerName,
      markerDescription: args.markerDescription,
      value: args.value,
      units: args.units,
      referenceRange: args.referenceRange,
      source: args.source,
    });
    return id;
  },
});

export const batchCreate = mutation({
  args: {
    entries: v.array(
      v.object({
        drawDate: v.string(),
        markerName: v.string(),
        markerDescription: v.optional(v.string()),
        value: v.float64(),
        units: v.optional(v.string()),
        referenceRange: v.optional(v.string()),
        source: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const entry of args.entries) {
      const id = await ctx.db.insert("bloodlabs", {
        drawDate: entry.drawDate,
        markerName: entry.markerName,
        markerDescription: entry.markerDescription,
        value: entry.value,
        units: entry.units,
        referenceRange: entry.referenceRange,
        source: entry.source,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const remove = mutation({
  args: { id: v.id("bloodlabs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("bloodlabs").collect();

    // Unique draw dates
    const uniqueDates = new Set(allEntries.map((e) => e.drawDate));
    const totalDraws = uniqueDates.size;

    // Unique marker names
    const uniqueMarkers = new Set(allEntries.map((e) => e.markerName));
    const totalMarkers = uniqueMarkers.size;

    // Date range
    const dates = [...uniqueDates].sort();
    const dateRange =
      dates.length > 0
        ? { earliest: dates[0], latest: dates[dates.length - 1] }
        : { earliest: null, latest: null };

    // Flagged count: entries where value is outside referenceRange
    let flaggedCount = 0;
    for (const entry of allEntries) {
      if (!entry.referenceRange) continue;
      const match = entry.referenceRange.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
      if (!match) continue;
      const min = Number.parseFloat(match[1]);
      const max = Number.parseFloat(match[2]);
      if (Number.isNaN(min) || Number.isNaN(max)) continue;
      if (entry.value < min || entry.value > max) {
        flaggedCount++;
      }
    }

    return {
      totalDraws,
      totalMarkers,
      dateRange,
      flaggedCount,
    };
  },
});
