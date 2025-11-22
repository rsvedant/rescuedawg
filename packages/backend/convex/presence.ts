import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Update presence for an incident
export const updatePresence = mutation({
	args: {
		incidentId: v.id("incidents"),
		status: v.union(v.literal("viewing"), v.literal("away")),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const existing = await ctx.db
			.query("presence")
			.withIndex("by_user_incident", (q) =>
				q.eq("userId", identity.subject).eq("incidentId", args.incidentId),
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				status: args.status,
				lastSeen: Date.now(),
			});
		} else {
			await ctx.db.insert("presence", {
				incidentId: args.incidentId,
				userId: identity.subject,
				userName: identity.name || "Unknown",
				status: args.status,
				lastSeen: Date.now(),
			});
		}

		return { success: true };
	},
});

// Get viewers for an incident
export const getViewers = query({
	args: { incidentId: v.id("incidents") },
	handler: async (ctx, args) => {
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

		return await ctx.db
			.query("presence")
			.withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
			.filter((q) => q.gte(q.field("lastSeen"), fiveMinutesAgo))
			.collect();
	},
});

// Cleanup old presence records (scheduled function)
export const cleanupPresence = internalMutation({
	handler: async (ctx) => {
		const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

		const stale = await ctx.db
			.query("presence")
			.filter((q) => q.lt(q.field("lastSeen"), tenMinutesAgo))
			.collect();

		for (const record of stale) {
			await ctx.db.delete(record._id);
		}
	},
});
