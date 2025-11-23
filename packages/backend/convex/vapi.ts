import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Update incident with VAPI call data (from webhook)
export const updateWithVapiData = mutation({
	args: {
		incidentId: v.id("incidents"),
		vapiCallId: v.string(),
		collectedData: v.object({
			locationConfirmed: v.string(),
			peopleAffected: v.number(),
			currentStatus: v.string(),
			immediateHazards: v.array(v.string()),
			additionalInfo: v.optional(v.string()),
		}),
	},
	handler: async (ctx, args) => {
		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			vapiCallId: args.vapiCallId,
			vapiCollectedData: args.collectedData,
			vapiCallStatus: "collecting",
			version: incident.version + 1,
		});

		return { success: true };
	},
});

// Update incident with VAPI transcript (call ended)
export const updateVapiTranscript = mutation({
	args: {
		incidentId: v.id("incidents"),
		transcript: v.string(),
		vapiCallStatus: v.string(),
	},
	handler: async (ctx, args) => {
		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			vapiTranscript: args.transcript,
			vapiCallStatus: args.vapiCallStatus,
			version: incident.version + 1,
		});

		return { success: true };
	},
});

// Prepare emergency context for web call
export const prepareEmergencyContext = action({
	args: {
		incidentId: v.id("incidents"),
		emergency: v.object({
			type: v.string(),
			confidence: v.number(),
			description: v.string(),
			severity: v.string(),
		}),
		feedId: v.string(),
	},
	handler: async (ctx, args) => {
		// Update incident with pending call status
		await ctx.runMutation(internal.incidents.internalUpdateIncident, {
			incidentId: args.incidentId,
			updates: {
				vapiCallStatus: "pending",
			},
		});

		// Return context for frontend web call
		// System prompt is configured on VAPI dashboard, not overridden here
		return {
			incidentId: args.incidentId,
			emergency: args.emergency,
			feedId: args.feedId,
		};
	},
});
