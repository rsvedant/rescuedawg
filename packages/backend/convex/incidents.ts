import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all incidents with optional filters
export const getAll = query({
	args: {
		status: v.optional(v.string()),
		incidentType: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Authentication check
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		let incidents;

		// Apply filters
		if (args.status) {
			incidents = await ctx.db
				.query("incidents")
				.withIndex("by_status", (q) => q.eq("status", args.status!))
				.order("desc")
				.take(args.limit || 50);
		} else if (args.incidentType) {
			incidents = await ctx.db
				.query("incidents")
				.withIndex("by_type", (q) => q.eq("incidentType", args.incidentType!))
				.order("desc")
				.take(args.limit || 50);
		} else {
			incidents = await ctx.db
				.query("incidents")
				.withIndex("by_time")
				.order("desc")
				.take(args.limit || 50);
		}

		return incidents;
	},
});

// Get incident by ID
export const getById = query({
	args: { id: v.id("incidents") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		return await ctx.db.get(args.id);
	},
});

// Create new incident
export const create = mutation({
	args: {
		deviceId: v.string(),
		location: v.object({
			address: v.string(),
			city: v.string(),
			state: v.string(),
			zipCode: v.string(),
			coordinates: v.object({
				lat: v.number(),
				lon: v.number(),
			}),
			locationNotes: v.optional(v.string()),
		}),
		caller: v.object({
			phoneNumber: v.string(),
			name: v.optional(v.string()),
			relationship: v.optional(v.string()),
		}),
		description: v.string(),
		transcription: v.optional(v.string()),
		victims: v.optional(
			v.array(
				v.object({
					age: v.optional(v.number()),
					gender: v.optional(v.string()),
					condition: v.string(),
					injuries: v.array(v.string()),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		// Allow anonymous creation of incidents (reports)
		// Note: keep other mutations auth-protected.

		// Generate incident number
		const count = await ctx.db
			.query("incidents")
			.withIndex("by_time")
			.order("desc")
			.take(1);

		let incidentNumber = "2025-000001";
		if (count.length > 0) {
			const lastIncident = count[0];
			if (lastIncident && lastIncident.incidentNumber) {
				const parts = lastIncident.incidentNumber.split("-");
				if (parts.length === 2 && parts[1]) {
					const nextNum = parseInt(parts[1]) + 1;
					incidentNumber = `2025-${String(nextNum).padStart(6, "0")}`;
				}
			}
		}

		const incidentId = await ctx.db.insert("incidents", {
			incidentNumber,
			callReceived: Date.now(),
			incidentType: "unknown",
			severity: 3,
			priority: "MEDIUM",
			location: args.location,
			caller: args.caller,
			description: args.description,
			transcription: args.transcription,
			victims: args.victims || [],
			assignedUnits: [],
			status: "received",
			version: 1,
			createdBy: args.deviceId || "anonymous",
		});

		return incidentId;
	},
});

// Update incident status
export const updateStatus = mutation({
	args: {
		incidentId: v.id("incidents"),
		status: v.string(),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			status: args.status,
			lastUpdatedBy: identity.email || identity.subject,
			lastUpdatedAt: Date.now(),
			version: incident.version + 1,
		});

		// Log to history
		await ctx.db.insert("incidentHistory", {
			incidentId: args.incidentId,
			changes: { status: args.status, notes: args.notes },
			updatedBy: identity.email || identity.subject,
			timestamp: Date.now(),
		});

		return { success: true };
	},
});

// Add note to incident
export const addNote = mutation({
	args: {
		incidentId: v.id("incidents"),
		note: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		await ctx.db.insert("incidentHistory", {
			incidentId: args.incidentId,
			changes: { note: args.note },
			updatedBy: identity.email || identity.subject,
			timestamp: Date.now(),
		});

		return { success: true };
	},
});

// Assign response units
export const assignUnits = mutation({
	args: {
		incidentId: v.id("incidents"),
		units: v.array(
			v.object({
				unitId: v.string(),
				department: v.string(),
				status: v.string(),
				personnelCount: v.number(),
				eta: v.optional(v.number()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			assignedUnits: args.units,
			lastUpdatedBy: identity.email || identity.subject,
			lastUpdatedAt: Date.now(),
			version: incident.version + 1,
		});

		// Log to history
		await ctx.db.insert("incidentHistory", {
			incidentId: args.incidentId,
			changes: { assignedUnits: args.units },
			updatedBy: identity.email || identity.subject,
			timestamp: Date.now(),
		});

		return { success: true };
	},
});

// Update AI analysis
export const updateAIAnalysis = mutation({
	args: {
		incidentId: v.id("incidents"),
		analysis: v.string(),
		incidentType: v.string(),
		severity: v.number(),
		priority: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			aiAnalysis: args.analysis,
			incidentType: args.incidentType,
			severity: args.severity,
			priority: args.priority,
			lastUpdatedBy: identity.email || identity.subject,
			lastUpdatedAt: Date.now(),
			version: incident.version + 1,
		});

		return { success: true };
	},
});

// Internal mutation for system updates (no auth required)
export const internalUpdateIncident = internalMutation({
	args: {
		incidentId: v.id("incidents"),
		updates: v.any(),
	},
	handler: async (ctx, args) => {
		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			...args.updates,
			version: incident.version + 1,
		});
	},
});
