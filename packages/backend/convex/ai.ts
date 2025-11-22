import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText, streamText, tool } from "ai";
import { z } from "zod";
import { internal } from "./_generated/api";

// Analyze incident and classify emergency type
export const analyzeIncident = action({
	args: {
		incidentId: v.id("incidents"),
	},
	handler: async (ctx, args) => {
		// Get incident details
		const incident = await ctx.runQuery(internal.ai.getIncidentForAnalysis, {
			incidentId: args.incidentId,
		});

		if (!incident) {
			throw new Error("Incident not found");
		}

		// Build comprehensive prompt
		const prompt: string = `You are an emergency response AI system. Analyze the following 911 incident and provide a detailed classification.

INCIDENT DETAILS:
Location: ${incident.location.address}, ${incident.location.city}, ${incident.location.state}
Description: ${incident.description}
${incident.transcription ? `Transcript: ${incident.transcription}` : ""}
${incident.victims.length > 0 ? `Victims: ${incident.victims.length} person(s)` : ""}

TASK: Analyze this incident and provide:
1. Incident Type (medical, fire, police, hazmat, or multi-agency)
2. Severity (1-5, where 5 is most critical)
3. Priority Level (LOW, MEDIUM, HIGH, or CRITICAL)
4. Required Departments (EMS, Fire, Police, or combination)
5. Recommended Response (brief action plan)

Provide your analysis in a structured format.`;

		const { text } = await generateText({
			model: "xai/grok-4-fast-reasoning",
			prompt,
			temperature: 0.3, // Lower temperature for more consistent analysis
		});

		// Parse the AI response and extract classification
		const analysis: string = text;

		// Extract key information using simple parsing
		const incidentType = extractIncidentType(analysis);
		const severity = extractSeverity(analysis);
		const priority = extractPriority(analysis);

		// Update incident with AI analysis
		await ctx.runMutation(internal.incidents.internalUpdateIncident, {
			incidentId: args.incidentId,
			updates: {
				aiAnalysis: analysis,
				incidentType,
				severity,
				priority,
			},
		});

		return {
			analysis,
			incidentType,
			severity,
			priority,
		};
	},
});

// Route incident to appropriate departments with tool calling
export const routeIncident = action({
	args: {
		incidentId: v.id("incidents"),
	},
	handler: async (ctx, args): Promise<any> => {
		const incident: any = await ctx.runQuery(internal.ai.getIncidentForAnalysis, {
			incidentId: args.incidentId,
		});

		if (!incident) {
			throw new Error("Incident not found");
		}

		const result: any = await streamText({
			model: "xai/grok-4-fast-reasoning",
			prompt: `Analyze this emergency incident and determine which departments to notify:

Incident Type: ${incident.incidentType}
Severity: ${incident.severity}/5
Description: ${incident.description}
Location: ${incident.location.address}

Determine which emergency services to dispatch and with what priority.`,
			tools: {
				routeToEMS: tool({
					description: "Route incident to Emergency Medical Services",
					inputSchema: z.object({
						severity: z.enum(["low", "medium", "high", "critical"]),
						reason: z.string().describe("Why EMS is needed"),
						estimatedResponseTime: z.number().describe("Estimated ETA in minutes"),
					}),
					execute: async ({ severity, reason }) => {
						// Log routing decision
						return {
							routed: true,
							department: "EMS",
							severity,
							reason,
							timestamp: Date.now(),
						};
					},
				}),
				routeToFire: tool({
					description: "Route incident to Fire Department",
					inputSchema: z.object({
						fireDetected: z.boolean(),
						hazmat: z.boolean(),
						rescue: z.boolean(),
						reason: z.string(),
					}),
					execute: async ({ fireDetected, hazmat, rescue, reason }) => {
						return {
							routed: true,
							department: "Fire",
							capabilities: { fireDetected, hazmat, rescue },
							reason,
							timestamp: Date.now(),
						};
					},
				}),
				routeToPolice: tool({
					description: "Route incident to Police Department",
					inputSchema: z.object({
						criminalActivity: z.boolean(),
						trafficControl: z.boolean(),
						securityThreat: z.boolean(),
						reason: z.string(),
					}),
					execute: async ({ criminalActivity, trafficControl, reason }) => {
						return {
							routed: true,
							department: "Police",
							requirements: { criminalActivity, trafficControl },
							reason,
							timestamp: Date.now(),
						};
					},
				}),
			},
		});

		return result.toTextStreamResponse();
	},
});

// Generate emergency response recommendations
export const generateResponsePlan = action({
	args: {
		incidentId: v.id("incidents"),
	},
	handler: async (ctx, args) => {
		const incident = await ctx.runQuery(internal.ai.getIncidentForAnalysis, {
			incidentId: args.incidentId,
		});

		if (!incident) {
			throw new Error("Incident not found");
		}

		const prompt: string = `Generate a detailed emergency response plan for:

Type: ${incident.incidentType}
Severity: ${incident.severity}/5
Priority: ${incident.priority}
Location: ${incident.location.address}
Description: ${incident.description}
Victims: ${incident.victims.length}

Provide:
1. Immediate actions for first responders
2. Resource requirements
3. Safety considerations
4. Expected challenges
5. Recommended approach`;

		const { text }: { text: string } = await generateText({
			model: "xai/grok-4-fast-reasoning",
			prompt,
		});

		return { responsePlan: text };
	},
});

// Internal query to get incident for AI analysis (no auth required for internal use)
export const getIncidentForAnalysis = internalQuery({
	args: { incidentId: v.id("incidents") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.incidentId);
	},
});

// Helper functions for parsing AI responses
function extractIncidentType(analysis: string): string {
	const lower = analysis.toLowerCase();
	if (lower.includes("multi-agency")) return "multi-agency";
	if (lower.includes("hazmat") || lower.includes("chemical")) return "hazmat";
	if (lower.includes("fire") || lower.includes("smoke")) return "fire";
	if (lower.includes("police") || lower.includes("crime") || lower.includes("assault"))
		return "police";
	if (
		lower.includes("medical") ||
		lower.includes("ems") ||
		lower.includes("ambulance")
	)
		return "medical";
	return "unknown";
}

function extractSeverity(analysis: string): number {
	const severityMatch = analysis.match(/severity[:\s]+(\d)/i);
	if (severityMatch && severityMatch[1]) return parseInt(severityMatch[1]);

	// Fallback based on keywords
	const lower = analysis.toLowerCase();
	if (lower.includes("critical") || lower.includes("life-threatening")) return 5;
	if (lower.includes("serious") || lower.includes("urgent")) return 4;
	if (lower.includes("moderate")) return 3;
	if (lower.includes("minor")) return 2;
	return 3; // Default to moderate
}

function extractPriority(analysis: string): string {
	const lower = analysis.toLowerCase();
	if (lower.includes("critical")) return "CRITICAL";
	if (lower.includes("high")) return "HIGH";
	if (lower.includes("medium") || lower.includes("moderate")) return "MEDIUM";
	if (lower.includes("low")) return "LOW";
	return "MEDIUM";
}

// Analyze incident with VAPI data (enhanced version)
export const analyzeIncidentWithVapiData = action({
	args: {
		incidentId: v.id("incidents"),
	},
	handler: async (ctx, args) => {
		const incident: any = await ctx.runQuery(internal.ai.getIncidentForAnalysis, {
			incidentId: args.incidentId,
		});

		if (!incident) {
			throw new Error("Incident not found");
		}

		// Build enhanced prompt with BOTH CV detection AND VAPI data
		const prompt: string = `You are an emergency response AI system. Synthesize information from TWO sources to provide a comprehensive incident classification.

SOURCE 1 - COMPUTER VISION DETECTION (AI):
Description: ${incident.description}
${incident.aiAnalysis ? `Previous Analysis: ${incident.aiAnalysis}` : ""}

SOURCE 2 - BYSTANDER INTERVIEW (VAPI Call):
${incident.vapiTranscript ? `Full Transcript:\n${incident.vapiTranscript}\n` : "No VAPI data available yet."}

${
	incident.vapiCollectedData
		? `Collected Data:
- Location: ${incident.vapiCollectedData.locationConfirmed}
- People Affected: ${incident.vapiCollectedData.peopleAffected}
- Current Status: ${incident.vapiCollectedData.currentStatus}
- Immediate Hazards: ${incident.vapiCollectedData.immediateHazards.join(", ")}
${incident.vapiCollectedData.additionalInfo ? `- Additional Info: ${incident.vapiCollectedData.additionalInfo}` : ""}
`
		: ""
}

TASK: Synthesize BOTH sources (prioritizing human-confirmed details from VAPI) and provide:
1. Final Incident Type (medical, fire, police, hazmat, or multi-agency)
2. Final Severity (1-5, where 5 is most critical)
3. Final Priority Level (LOW, MEDIUM, HIGH, or CRITICAL)
4. Confidence Assessment (how well do CV and VAPI data align?)
5. Recommended Response (brief action plan based on synthesized information)

If CV and VAPI data conflict, explain the discrepancy and prioritize human-confirmed details.`;

		const { text }: { text: string } = await generateText({
			model: "xai/grok-4-fast-reasoning",
			prompt,
			temperature: 0.2, // Lower for more deterministic synthesis
		});

		const analysis: string = text;

		// Extract key information
		const incidentType = extractIncidentType(analysis);
		const severity = extractSeverity(analysis);
		const priority = extractPriority(analysis);

		// Update incident with enhanced analysis
		await ctx.runMutation(internal.incidents.internalUpdateIncident, {
			incidentId: args.incidentId,
			updates: {
				aiAnalysis: `[SYNTHESIZED CV + VAPI]\n\n${analysis}`,
				incidentType,
				severity,
				priority,
			},
		});

		return {
			analysis,
			incidentType,
			severity,
			priority,
		};
	},
});

// Import internalQuery
import { internalQuery } from "./_generated/server";
