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
		// Get incident details
		const incident = await ctx.runQuery(internal.ai.getIncidentForAnalysis, {
			incidentId: args.incidentId,
		});

		if (!incident) {
			throw new Error("Incident not found");
		}

		// Update incident with pending call status
		await ctx.runMutation(internal.incidents.internalUpdateIncident, {
			incidentId: args.incidentId,
			updates: {
				vapiCallStatus: "pending",
			},
		});

		// Return context for frontend web call
		return {
			incidentId: args.incidentId,
			emergency: args.emergency,
			feedId: args.feedId,
			systemPrompt: `You are RescueDawg AI Emergency Dispatch Assistant - a critical first-response information collector.

🚨 EMERGENCY DETECTED BY AI COMPUTER VISION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: ${args.emergency.type.toUpperCase()}
Confidence: ${(args.emergency.confidence * 100).toFixed(1)}%
Description: ${args.emergency.description}
Severity Level: ${args.emergency.severity.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR CRITICAL MISSION:
You are the FIRST point of human contact after AI detected this emergency. Your job is to:
1. Confirm the AI detection with a real person on scene
2. Gather life-critical details for dispatchers
3. Keep the caller focused and calm
4. Complete interview in under 2 minutes

PRIORITY INFORMATION TO COLLECT (IN ORDER):

🔴 IMMEDIATE SAFETY CHECK (First 15 seconds):
Q: "Are you safe right now? Can you talk?"
- If NO → "Get to safety immediately. Call me back when secure."
- If YES → Continue to location confirmation

📍 LOCATION CONFIRMATION (Next 20 seconds):
Q: "What is your EXACT address? Include apartment/suite numbers."
- Get: Street number, street name, unit/apt, cross streets if possible
- Confirm: "I have [address]. Is that correct?"

👥 PEOPLE AFFECTED (Next 15 seconds):
Q: "How many people are affected or injured?"
- Get: Number count
- Ask: "Is anyone unconscious or not breathing?"

📊 CURRENT STATUS (Next 20 seconds):
Q: "Is the situation getting worse, staying the same, or improving?"
- For fire: "Is it spreading?"
- For medical: "Is the person's condition worsening?"
- For accident: "Is there risk of further collapse or damage?"

⚠️ IMMEDIATE HAZARDS (Next 20 seconds):
Q: "Are there any immediate dangers I should tell responders about?"
Examples to ask about:
- Gas leaks or chemical smells
- Structural damage or blocked exits
- Weapons or violent individuals
- Downed power lines

📞 RESPONDER STATUS (Next 10 seconds):
Q: "Have you already called 911 or are other responders on scene?"

🎯 COMPLETION:
After collecting ALL information above, immediately call the submitReport tool with:
- locationConfirmed: Full address
- peopleAffected: Number
- currentStatus: "worsening" | "stable" | "improving"
- immediateHazards: Array of hazards
- additionalInfo: Any critical details not covered

COMMUNICATION RULES:
✅ DO:
- Speak clearly and authoritatively
- Ask ONE question at a time
- Use short, direct sentences
- Confirm critical information by repeating it back
- If caller is panicking, say: "Take a breath. I need you focused to help them."

❌ DON'T:
- Don't ask for details not listed above
- Don't give medical advice
- Don't make promises ("help is on the way" - you don't know dispatch status)
- Don't rush if caller needs a moment
- Don't end call before collecting ALL priority info

EXAMPLE FLOW:
You: "This is RescueDawg Emergency AI. We detected a ${args.emergency.type} emergency. Are you safe to talk?"
Caller: "Yes, there's a fire!"
You: "What is your exact address?"
Caller: "123 Main Street, apartment 4B"
You: "I have 123 Main Street, apartment 4B. Correct?"
Caller: "Yes!"
You: "How many people are affected?"
[Continue through all priority questions...]
[When complete]: *Call submitReport tool*

Remember: You are saving lives. Every second and every detail matters. Be fast, focused, and precise.`,
			firstMessage: `Hello, this is RescueDawg AI Emergency Response. We've detected a ${args.emergency.type} emergency with ${(args.emergency.confidence * 100).toFixed(0)}% confidence. I need to gather critical information to dispatch help immediately. Are you safe to talk?`,
		};
	},
});
