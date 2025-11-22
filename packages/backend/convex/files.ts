import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate an upload URL for file uploads
export const generateUploadUrl = mutation({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		return await ctx.storage.generateUploadUrl();
	},
});

// Save file metadata after upload
export const saveFileMetadata = mutation({
	args: {
		storageId: v.id("_storage"),
		incidentId: v.id("incidents"),
		fileName: v.string(),
		fileType: v.string(),
		fileSize: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		await ctx.db.insert("incidentFiles", {
			storageId: args.storageId,
			incidentId: args.incidentId,
			fileName: args.fileName,
			fileType: args.fileType,
			fileSize: args.fileSize,
			uploadedBy: identity.email || identity.subject,
			uploadedAt: Date.now(),
		});

		return { success: true };
	},
});

// Get URL for a file
export const getFileUrl = query({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, args) => {
		return await ctx.storage.getUrl(args.storageId);
	},
});

// Get all files for an incident
export const getIncidentFiles = query({
	args: { incidentId: v.id("incidents") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const files = await ctx.db
			.query("incidentFiles")
			.withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
			.collect();

		// Generate URLs for all files
		const filesWithUrls = await Promise.all(
			files.map(async (file) => {
				const url = await ctx.storage.getUrl(file.storageId);
				return {
					...file,
					url,
				};
			}),
		);

		return filesWithUrls;
	},
});

// Delete a file
export const deleteFile = mutation({
	args: {
		fileId: v.id("incidentFiles"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		const file = await ctx.db.get(args.fileId);
		if (!file) {
			throw new Error("File not found");
		}

		// Delete from storage
		await ctx.storage.delete(file.storageId);

		// Delete metadata
		await ctx.db.delete(args.fileId);

		return { success: true };
	},
});
