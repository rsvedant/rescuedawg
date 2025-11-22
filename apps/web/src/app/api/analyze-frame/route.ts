import { ConvexHttpClient } from "convex/browser";
import { api } from "@rescuedawg/backend/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
	try {
		const { feedId, frameDataUrl } = await req.json();
		console.log("[API] Received frame analysis request for feedId:", feedId);

		if (!feedId || !frameDataUrl) {
			console.error("[API] Missing required fields");
			return Response.json(
				{ error: "Missing feedId or frameDataUrl" },
				{ status: 400 },
			);
		}

		console.log("[API] Calling Convex action...");
		// Call Convex action to analyze frame
		const result = await convex.action(api.videoAnalysis.analyzeFrame, {
			feedId,
			frameDataUrl,
		});

		console.log("[API] Analysis result:", result);

		return Response.json({ success: true, analysis: result });
	} catch (error: any) {
		console.error("[API] Frame analysis error:", error);
		return Response.json(
			{ error: error.message || "Failed to analyze frame" },
			{ status: 500 },
		);
	}
}
