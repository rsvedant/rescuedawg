import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Handle CV results from webhook (internal, no auth required)
export const handleCVResults = internalMutation({
	args: {
		incidentId: v.id("incidents"),
		analysisType: v.string(),
		results: v.any(),
		confidence: v.number(),
		processingTime: v.number(),
	},
	handler: async (ctx, args) => {
		// Store CV analysis results
		await ctx.db.insert("cvAnalysis", {
			incidentId: args.incidentId,
			analysisType: args.analysisType,
			results: args.results,
			confidence: args.confidence,
			processingTime: args.processingTime,
			receivedAt: Date.now(),
		});

		// Update incident with CV completion flag
		const incident = await ctx.db.get(args.incidentId);
		if (incident) {
			await ctx.db.patch(args.incidentId, {
				cvAnalysisComplete: true,
				version: incident.version + 1,
			});
		}

		// Process different analysis types
		switch (args.analysisType) {
			case "person-detection":
				await handlePersonDetection(ctx, args);
				break;
			case "scene-analysis":
				await handleSceneAnalysis(ctx, args);
				break;
			case "lidar-processing":
				await handleLidarProcessing(ctx, args);
				break;
		}
	},
});

// Handle person detection results
async function handlePersonDetection(ctx: any, args: any) {
	const { results } = args;

	// Update victim count if detected
	if (results.personsDetected > 0) {
		const incident = await ctx.db.get(args.incidentId);
		if (incident) {
			// Merge detected persons with existing victims
			const detectedVictims = (results.persons || []).map((person: any) => ({
				condition: person.posture === "prone" ? "unconscious" : "unknown",
				injuries: inferInjuriesFromPose(person.pose || []),
				age: person.estimatedAge,
				gender: person.estimatedGender,
			}));

			await ctx.db.patch(args.incidentId, {
				victims: [...incident.victims, ...detectedVictims],
				version: incident.version + 1,
			});
		}
	}
}

// Handle scene analysis results
async function handleSceneAnalysis(ctx: any, args: any) {
	const { results } = args;

	// Extract scene information
	const sceneData = {
		environment: results.environment || "unknown",
		hazards: results.detectedHazards || [],
		accessibility: results.accessibility,
	};

	await ctx.db.insert("sceneData", {
		incidentId: args.incidentId,
		...sceneData,
		timestamp: Date.now(),
	});
}

// Handle LiDAR processing results
async function handleLidarProcessing(ctx: any, args: any) {
	const incident = await ctx.db.get(args.incidentId);
	if (incident) {
		await ctx.db.patch(args.incidentId, {
			lidarDataUrl: args.results.pointCloudUrl,
			version: incident.version + 1,
		});
	}
}

// Helper function to infer injuries from detected pose
function inferInjuriesFromPose(pose: string[]): string[] {
	const injuries: string[] = [];

	if (pose.includes("head-down") || pose.includes("head-trauma-indicators")) {
		injuries.push("possible head trauma");
	}
	if (pose.includes("limb-bent-abnormal") || pose.includes("fracture-indicators")) {
		injuries.push("possible fracture");
	}
	if (pose.includes("chest-compression")) {
		injuries.push("possible chest injury");
	}
	if (pose.includes("bleeding-detected")) {
		injuries.push("external bleeding");
	}

	return injuries.length > 0 ? injuries : ["undetermined"];
}

// Trigger CV analysis (for testing/manual trigger)
export const triggerCVAnalysis = mutation({
	args: {
		incidentId: v.id("incidents"),
		videoUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		// In production, this would call your CV pipeline API
		// For now, return a mock job ID
		const jobId = `cv-${Date.now()}`;

		// Store job reference
		await ctx.db.insert("cvJobs", {
			jobId,
			incidentId: args.incidentId,
			videoUrl: args.videoUrl,
			status: "processing",
			startedAt: Date.now(),
		});

		// In production, you would:
		// 1. Upload video to CV pipeline
		// 2. Receive webhook when processing completes
		// 3. handleCVResults gets called via webhook

		// For demo purposes, simulate completion after 5 seconds
		await ctx.scheduler.runAfter(5000, internal.cvProcessing.simulateCompletion, {
			jobId,
			incidentId: args.incidentId,
		});

		return { jobId };
	},
});

// Get CV results for an incident
export const getCVResults = query({
	args: { incidentId: v.id("incidents") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		return await ctx.db
			.query("cvAnalysis")
			.withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
			.collect();
	},
});

// Simulate CV completion (for demo)
export const simulateCompletion = internalMutation({
	args: {
		jobId: v.string(),
		incidentId: v.id("incidents"),
	},
	handler: async (ctx, args) => {
		// Update job status
		const job = await ctx.db
			.query("cvJobs")
			.filter((q) => q.eq(q.field("jobId"), args.jobId))
			.first();

		if (job) {
			await ctx.db.patch(job._id, {
				status: "completed",
				completedAt: Date.now(),
			});

			// Simulate CV results
			await ctx.runMutation(internal.cvProcessing.handleCVResults, {
				incidentId: args.incidentId,
				analysisType: "person-detection",
				results: {
					personsDetected: 1,
					persons: [
						{
							posture: "prone",
							pose: ["head-down", "limb-bent-abnormal"],
							estimatedAge: 65,
							estimatedGender: "male",
						},
					],
				},
				confidence: 0.87,
				processingTime: 5000,
			});
		}
	},
});
