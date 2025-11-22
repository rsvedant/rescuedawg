import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getActive = query({
	handler: async (ctx) => {
		return await ctx.db
			.query("videoFeeds")
			.filter((q) =>
				q.or(
					q.eq(q.field("status"), "monitoring"),
					q.eq(q.field("status"), "alert"),
				),
			)
			.order("desc")
			.collect();
	},
});

export const getAll = query({
	handler: async (ctx) => {
		return await ctx.db.query("videoFeeds").order("desc").collect();
	},
});

export const getByFeedId = query({
	args: { feedId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("videoFeeds")
			.withIndex("by_feedId", (q) => q.eq("feedId", args.feedId))
			.first();
	},
});

export const register = mutation({
	args: {
		feedId: v.string(),
		deviceId: v.string(),
		name: v.string(),
		location: v.object({
			address: v.string(),
			coordinates: v.object({
				lat: v.number(),
				lon: v.number(),
			}),
		}),
	},
	handler: async (ctx, args) => {
		// Check if feed already exists
		const existing = await ctx.db
			.query("videoFeeds")
			.withIndex("by_feedId", (q) => q.eq("feedId", args.feedId))
			.first();

		if (existing) {
			// Update existing feed
			await ctx.db.patch(existing._id, {
				status: "monitoring",
				lastSeenAt: Date.now(),
			});
			return existing._id;
		}

		// Create new feed
		return await ctx.db.insert("videoFeeds", {
			feedId: args.feedId,
			deviceId: args.deviceId,
			name: args.name,
			location: args.location,
			status: "monitoring",
			isAnalyzing: true,
			analysisMode: "idle",
			createdAt: Date.now(),
			lastSeenAt: Date.now(),
		});
	},
});

export const updateStatus = mutation({
	args: {
		feedId: v.string(),
		status: v.string(), // "monitoring" | "alert" | "inactive"
	},
	handler: async (ctx, args) => {
		// No auth required - automated system operation
		const feed = await ctx.db
			.query("videoFeeds")
			.withIndex("by_feedId", (q) => q.eq("feedId", args.feedId))
			.first();

		if (feed) {
			await ctx.db.patch(feed._id, {
				status: args.status,
				lastSeenAt: Date.now(),
			});
		}
	},
});

export const updateAnalysisMode = mutation({
	args: {
		feedId: v.string(),
		analysisMode: v.string(), // "idle" | "monitoring" | "alert"
	},
	handler: async (ctx, args) => {
		// No auth required - automated system operation
		const feed = await ctx.db
			.query("videoFeeds")
			.withIndex("by_feedId", (q) => q.eq("feedId", args.feedId))
			.first();

		if (feed) {
			await ctx.db.patch(feed._id, {
				analysisMode: args.analysisMode,
				lastFrameAnalyzedAt: Date.now(),
			});
		}
	},
});

export const deregister = mutation({
	args: {
		feedId: v.string(),
	},
	handler: async (ctx, args) => {
		const feed = await ctx.db
			.query("videoFeeds")
			.withIndex("by_feedId", (q) => q.eq("feedId", args.feedId))
			.first();

		if (feed) {
			// Actually delete the feed from the database
			await ctx.db.delete(feed._id);
			console.log(`Deleted video feed: ${args.feedId}`);
		}
	},
});
