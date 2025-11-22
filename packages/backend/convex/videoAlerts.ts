import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createWithIncident = mutation({
	args: {
		feedId: v.string(),
		alertType: v.string(),
		confidence: v.number(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		// Allow unauthenticated auto-creation from CV pipeline

		// Get feed information
		const feed = await ctx.db
			.query("videoFeeds")
			.withIndex("by_feedId", (q) => q.eq("feedId", args.feedId))
			.first();

		if (!feed) {
			throw new Error("Video feed not found");
		}

		// Create alert record
		const alertId = await ctx.db.insert("videoAlerts", {
			feedId: args.feedId,
			frameTimestamp: Date.now(),
			alertType: args.alertType,
			confidence: args.confidence,
			description: args.description,
			resolved: false,
			createdAt: Date.now(),
		});

		// Auto-create incident
		const incidentNumber = `AI-${Date.now().toString().slice(-6)}`;
		const incidentType = mapAlertToIncidentType(args.alertType);
		const severity = args.alertType === "fire" ? 5 : 4;
		const priority = severity >= 4 ? "CRITICAL" : "HIGH";

		const incidentId = await ctx.db.insert("incidents", {
			incidentNumber,
			callReceived: Date.now(),
			incidentType,
			severity,
			priority,
			location: {
				address: feed.location.address,
				city: "Unknown",
				state: "CA",
				zipCode: "00000",
				coordinates: feed.location.coordinates,
			},
			caller: {
				phoneNumber: "AI-DETECTED",
				name: "Video Analysis System",
				relationship: "automated",
			},
			description: `AI DETECTED ${args.alertType.toUpperCase()}: ${args.description}`,
			transcription: `Confidence: ${(args.confidence * 100).toFixed(1)}%\nSource: ${feed.name} (${args.feedId})\nDetection: ${args.description}`,
			victims: [],
			assignedUnits: [],
			status: "active",
			version: 1,
			createdBy: "ai-system",

			// Dog View (Body Camera) Link
			dogViewFeedId: args.feedId,
			dogViewRoomName: "emergency-feeds",
			dogViewStartTime: Date.now(),
		});

		// Link alert to incident
		await ctx.db.patch(alertId, { incidentId });

		return { alertId, incidentId };
	},
});

export const getByFeed = query({
	args: {
		feedId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("videoAlerts")
			.withIndex("by_feed", (q) => q.eq("feedId", args.feedId))
			.order("desc")
			.take(args.limit || 10);
	},
});

export const getRecent = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("videoAlerts")
			.order("desc")
			.take(args.limit || 20);
	},
});

export const resolve = mutation({
	args: {
		alertId: v.id("videoAlerts"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		await ctx.db.patch(args.alertId, {
			resolved: true,
		});

		return { success: true };
	},
});

function mapAlertToIncidentType(alertType: string): string {
	const mapping: Record<string, string> = {
		fire: "fire",
		medical: "medical",
		accident: "medical",
		violence: "police",
		hazard: "hazmat",
	};
	return mapping[alertType] || "multi-agency";
}
