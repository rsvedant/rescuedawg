import { action } from "./_generated/server";
import { v } from "convex/values";
import { SignJWT } from "jose";

export const generateToken = action({
	args: {
		identity: v.string(),
		roomName: v.string(),
	},
	handler: async (ctx, args) => {
		const apiKey = process.env.LIVEKIT_API_KEY;
		const apiSecret = process.env.LIVEKIT_API_SECRET;

		if (!apiKey || !apiSecret) {
			throw new Error("LiveKit credentials not configured");
		}

		// Generate JWT token for LiveKit
		const jwt = await new SignJWT({
			video: {
				roomJoin: true,
				room: args.roomName,
				canPublish: true,
				canSubscribe: true,
			},
		})
			.setProtectedHeader({ alg: "HS256" })
			.setIssuer(apiKey)
			.setSubject(args.identity)
			.setAudience("livekit")
			.setExpirationTime("1h")
			.sign(new TextEncoder().encode(apiSecret));

		return jwt;
	},
});
