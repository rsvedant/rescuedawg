import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { api } from "./_generated/api";
import { z } from "zod";

// Strict Zod schema for emergency analysis response
const EmergencySchema = z.object({
	type: z.enum(["fire", "medical", "accident", "violence", "hazard"]),
	confidence: z.number().min(0).max(1),
	description: z.string().min(1),
	severity: z.enum(["low", "medium", "high", "critical"]),
	requiredUnits: z.array(z.string()).optional(),
});

const AnalysisResponseSchema = z.object({
	emergencies: z.array(EmergencySchema),
	requiresImmediateAction: z.boolean(),
});

// Infer TypeScript types from Zod schemas
export type Emergency = z.infer<typeof EmergencySchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export const analyzeFrame = action({
	args: {
		feedId: v.string(),
		frameDataUrl: v.string(),
	},
	handler: async (ctx, args): Promise<AnalysisResponse & { incidentId?: string; error?: string; rawResponse?: string }> => {
		try {
			// Extract base64 string from data URL
			// Format: "data:image/jpeg;base64,/9j/4AAQ..."
			// We need just: "/9j/4AAQ..."
			const base64Match = args.frameDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
			if (!base64Match || !base64Match[1]) {
				console.error("Invalid data URL format:", args.frameDataUrl.substring(0, 100));
				return {
					emergencies: [],
					requiresImmediateAction: false,
					error: "Invalid image data URL format",
				};
			}
			const base64Image = base64Match[1];
			console.log("Extracted base64 image, length:", base64Image.length);

			const result = await generateText({
				model: google("gemini-2.0-flash-exp"),
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `You are RescueDawg AI - an emergency detection system analyzing live video from field responder body cameras and security feeds.

YOUR MISSION: Identify real emergencies that require immediate response. Lives depend on accurate, decisive detection.

DETECTION CATEGORIES:
1. 🔥 FIRE - Visible flames (any size), active burning, dense smoke, glowing embers
2. 🚑 MEDICAL - Person collapsed/fallen, visible injury with bleeding, seizure, obvious distress/pain
3. 🚗 ACCIDENT - Vehicle collision (any damage level), structural damage, person trapped
4. ⚔️ VIOLENCE - Physical altercation, weapon visible, assault in progress, threatening behavior
5. ☣️ HAZARD - Liquid spill, gas/chemical leak, electrical sparking, structural instability

ANALYZE THIS FRAME:
Look for ANY signs of the above emergencies. Even small indicators matter:
- Small flames or smoke = still a fire
- Person on ground in unusual position = potential medical
- Minor vehicle damage = still an accident
- Aggressive posturing = potential violence
- Any visible spill/leak = hazard

CONFIDENCE SCORING:
- 0.90-1.00 = CERTAIN (clear, unambiguous emergency)
- 0.75-0.89 = HIGH (strong indicators, likely emergency)
- 0.60-0.74 = MODERATE (some indicators, possible emergency)
- 0.50-0.59 = LOW (weak indicators, uncertain)

SEVERITY LEVELS:
- CRITICAL: Immediate life threat (major fire, critical injury, active violence)
- HIGH: Serious emergency (moderate fire, serious injury, crash with injuries)
- MEDIUM: Significant incident (small fire, minor injury, property damage)
- LOW: Developing situation (smoke without flames, person in distress)

OUTPUT FORMAT (JSON):

If NO emergency detected:
{
  "emergencies": [],
  "requiresImmediateAction": false
}

If emergency detected:
{
  "emergencies": [
    {
      "type": "fire",
      "confidence": 0.82,
      "description": "Small flames visible on stovetop with light smoke rising",
      "severity": "medium",
      "requiredUnits": ["Fire", "EMS"]
    }
  ],
  "requiresImmediateAction": true
}

EXAMPLES:

🔥 FIRE Examples:
- Kitchen stove on fire → confidence: 0.75, severity: medium
- Building engulfed in flames → confidence: 0.95, severity: critical
- Smoke coming from window → confidence: 0.70, severity: high
- Small trash fire → confidence: 0.80, severity: medium

🚑 MEDICAL Examples:
- Person lying motionless on ground → confidence: 0.85, severity: high
- Person clutching chest, bent over → confidence: 0.75, severity: high
- Visible bleeding from wound → confidence: 0.90, severity: critical
- Person limping with visible injury → confidence: 0.70, severity: medium

🚗 ACCIDENT Examples:
- Cars with crushed front ends → confidence: 0.95, severity: high
- Single vehicle off road, damaged → confidence: 0.85, severity: medium
- Minor fender bender → confidence: 0.75, severity: low

IMPORTANT:
- Be DECISIVE - if you see indicators, flag it
- Better to alert and verify than miss a real emergency
- Empty array = genuinely normal scene (office work, people walking, etc.)
- Focus on SAVING LIVES - err on side of detection`,
							},
							{
								type: "image",
								image: base64Image,
							},
						],
					},
				],
				temperature: 0.6,
			});

			// Parse AI response - strip markdown if present
			let responseText = result.text.trim();
			console.log("Raw Gemini response:", responseText);

			// Remove markdown code fences if present
			if (responseText.startsWith("```")) {
				responseText = responseText
					.replace(/^```json\n?/, "")
					.replace(/^```\n?/, "")
					.replace(/\n?```$/, "")
					.trim();
			}

			// Parse JSON first
			let rawAnalysis;
			try {
				rawAnalysis = JSON.parse(responseText);
			} catch (parseError: any) {
				console.error("JSON parse error:", parseError);
				console.error("Failed text:", responseText);
				return {
					emergencies: [],
					requiresImmediateAction: false,
					error: `Failed to parse AI response: ${parseError.message}`,
					rawResponse: responseText,
				};
			}

			// Validate with Zod schema
			const validationResult = AnalysisResponseSchema.safeParse(rawAnalysis);

			if (!validationResult.success) {
				console.error("Zod validation error:", validationResult.error);
				console.error("Invalid data:", rawAnalysis);
				return {
					emergencies: [],
					requiresImmediateAction: false,
					error: `Invalid analysis structure: ${validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
					rawResponse: responseText,
				};
			}

			// Get typed, validated analysis
			const analysis = validationResult.data;
			console.log("✅ Validated analysis:", JSON.stringify(analysis, null, 2));

			// Auto-create incident if high confidence emergency detected
			let createdIncidentId = undefined;
			if (analysis.requiresImmediateAction && analysis.emergencies.length > 0) {
				for (const emergency of analysis.emergencies) {
					// Lower threshold for safety-critical detection
					if (emergency.confidence > 0.70) {
						try {
							const incidentResult = await ctx.runMutation(
								api.videoAlerts.createWithIncident,
								{
									feedId: args.feedId,
									alertType: emergency.type,
									confidence: emergency.confidence,
									description: emergency.description,
								},
							);

							// Store incident ID for VAPI call
							createdIncidentId = incidentResult.incidentId;

							// Update feed status to alert
							await ctx.runMutation(api.videoFeeds.updateStatus, {
								feedId: args.feedId,
								status: "alert",
							});
						} catch (mutationError: any) {
							console.error("Failed to create incident:", mutationError);
							// Continue processing even if incident creation fails
						}
					}
				}
			}

			// Update analysis mode based on activity
			try {
				const analysisMode = analysis.requiresImmediateAction
					? "alert"
					: "monitoring";
				await ctx.runMutation(api.videoFeeds.updateAnalysisMode, {
					feedId: args.feedId,
					analysisMode,
				});
			} catch (mutationError: any) {
				console.error("Failed to update analysis mode:", mutationError);
				// Continue processing even if mode update fails
			}

			// Return analysis with incident ID if created
			return createdIncidentId 
				? { ...analysis, incidentId: createdIncidentId }
				: analysis;
		} catch (error: any) {
			console.error("Frame analysis error:", error);
			// Return error object instead of throwing
			return {
				emergencies: [],
				requiresImmediateAction: false,
				error: `Failed to analyze frame: ${error.message}`,
			};
		}
	},
});
