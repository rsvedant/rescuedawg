import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List messages for an incident
export const listMessages = query({
	args: { incidentId: v.id("incidents") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("departmentMessages")
			.withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
			.order("desc")
			.take(100);
	},
});

// Send a message
export const sendMessage = mutation({
	args: {
		incidentId: v.id("incidents"),
		message: v.string(),
		department: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		await ctx.db.insert("departmentMessages", {
			incidentId: args.incidentId,
			message: args.message,
			department: args.department,
			sender: identity.email || identity.subject,
			senderName: identity.name || "Unknown",
			timestamp: Date.now(),
		});

		return { success: true };
	},
});
