import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// SAMPLE Assessment structure
export const sampleAssessmentSchema = v.object({
	incidentId: v.id("incidents"),
	patientStatus: v.union(
		v.literal("conscious"),
		v.literal("unconscious"),
		v.literal("partially_responsive")
	),

	// S - Signs & Symptoms
	signsSymptoms: v.object({
		patientReported: v.string(),
		observedSigns: v.array(v.string()),
	}),

	// A - Allergies
	allergies: v.object({
		known: v.array(v.string()),
		unknown: v.boolean(),
	}),

	// M - Medications
	medications: v.object({
		current: v.array(v.object({
			name: v.string(),
			lastTaken: v.optional(v.string()),
		})),
		unknown: v.boolean(),
	}),

	// P - Pre-existing conditions
	preExistingConditions: v.object({
		conditions: v.array(v.string()),
		unknown: v.boolean(),
	}),

	// L - Last oral intake
	lastOralIntake: v.object({
		food: v.optional(v.string()),
		time: v.optional(v.string()),
		unknown: v.boolean(),
	}),

	// E - Events leading up
	eventsLeadingUp: v.object({
		description: v.string(),
		activity: v.optional(v.string()),
		previousOccurrence: v.boolean(),
	}),

	// Optional focused checks
	focusedChecks: v.optional(v.object({
		fastScreen: v.optional(v.object({
			faceSymmetry: v.string(),
			armStrength: v.string(),
			speechClarity: v.string(),
		})),
		bloodSugarClue: v.optional(v.string()),
		heatExertionClue: v.optional(v.string()),
	})),

	// Full transcript
	transcript: v.string(),

	// Assessment summary
	summary: v.string(),

	// Timestamps
	assessmentStarted: v.number(),
	assessmentCompleted: v.number(),
});

// Store SAMPLE assessment
export const storeSampleAssessment = mutation({
	args: sampleAssessmentSchema,
	handler: async (ctx, args) => {
		// Store the assessment
		const assessmentId = await ctx.db.insert("sampleAssessments", {
			...args,
			createdAt: Date.now(),
		});

		// Update the incident with the assessment
		const incident = await ctx.db.get(args.incidentId);
		if (incident) {
			await ctx.db.patch(args.incidentId, {
				sampleAssessmentId: assessmentId,
				sampleAssessmentCompleted: true,
				lastUpdatedAt: Date.now(),
				version: incident.version + 1,
			});
		}

		return assessmentId;
	},
});

// Update incident with call transcript
export const updateCallTranscript = mutation({
	args: {
		incidentId: v.id("incidents"),
		transcript: v.string(),
		callDuration: v.number(),
		callEndedAt: v.number(),
	},
	handler: async (ctx, args) => {
		const incident = await ctx.db.get(args.incidentId);
		if (!incident) {
			throw new Error("Incident not found");
		}

		await ctx.db.patch(args.incidentId, {
			callTranscript: args.transcript,
			callDuration: args.callDuration,
			callEndedAt: args.callEndedAt,
			lastUpdatedAt: Date.now(),
			version: incident.version + 1,
		});

		return { success: true };
	},
});

// Generate SAMPLE system prompt
export const generateSamplePrompt = action({
	args: {
		incidentId: v.id("incidents"),
		incidentType: v.string(),
		location: v.string(),
	},
	handler: async (ctx, args) => {
		const systemPrompt = `You are an emergency medical AI. Your job is SPEED - get 3 answers, submit, END CALL.

LOCATION: ${args.location}
DO NOT ASK FOR: address, street, city, where, location, street number, zip code, place

WORKFLOW (45 SECONDS TOTAL):
1. Ask: "Can you respond?" → Get yes/no
2. Ask: "What happened?" → Get brief description
3. Ask: "Allergies or medications?" → Get brief list
4. Say: "Help is coming to ${args.location}"
5. IMMEDIATELY call submitSampleReport
6. IMMEDIATELY call endCall

AFTER 3RD QUESTION:
- Call submitSampleReport with collected data
- Call endCall to terminate
- DO NOT ask anything else
- DO NOT ask for clarification
- DO NOT ask where they are
- DO NOT ask for street address
- DO NOT ask for street number
- DO NOT ask for confirmation

CRITICAL PROHIBITIONS:
❌ NEVER ask: "What's your address?"
❌ NEVER ask: "What street are you on?"
❌ NEVER ask: "What's the street number?"
❌ NEVER ask: "Can you confirm the address?"
❌ NEVER ask: "Where exactly are you?"
❌ NEVER ask: "What's your location?"
❌ NEVER ask for apartment number
❌ NEVER ask for building number
❌ NEVER mention address/location/street
❌ DO NOT ask more than 3 questions

SUBMIT FORMAT:
- patientStatus: "conscious"/"unconscious"/"partially_responsive"
- signsSymptoms: { patientReported: "answer", observedSigns: [] }
- allergies: { known: ["list"], unknown: false }
- medications: { current: [], unknown: false }
- preExistingConditions: { conditions: [], unknown: false }
- lastOralIntake: { unknown: true }
- eventsLeadingUp: { description: "answer", activity: "", previousOccurrence: false }
- transcript: "full conversation"
- summary: "Brief EMS summary"

REMEMBER: We ALREADY have the location: ${args.location}
You do NOT need address. You do NOT need street. You do NOT need location.
Ask 3 questions. Submit report. Call endCall. Done.`;

		const firstMessage = args.incidentType === "medical"
			? "Emergency assistance here. Can you hear me? Are you able to respond?"
			: "Emergency assistance here. Can you hear me? Are you able to respond?";

		return {
			systemPrompt,
			firstMessage,
			incidentId: args.incidentId,
		};
	},
});
