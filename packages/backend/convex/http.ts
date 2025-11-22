import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// Webhook endpoint for CV analysis results
http.route({
	path: "/webhooks/cv-analysis",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		// Verify webhook signature (implement based on your CV provider)
		const signature = request.headers.get("x-cv-signature");
		const secretKey = process.env.CV_WEBHOOK_SECRET;

		// In production, verify the signature
		// if (!verifySignature(signature, await request.text(), secretKey)) {
		//   return new Response("Unauthorized", { status: 401 });
		// }

		try {
			const payload = await request.json();

			// Schedule processing mutation
			await ctx.runMutation(internal.cvProcessing.handleCVResults, {
				incidentId: payload.incidentId as any,
				analysisType: payload.type,
				results: payload.results,
				confidence: payload.confidence,
				processingTime: payload.processingTime,
			});

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error: any) {
			return new Response(
				JSON.stringify({ error: error.message }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}),
});

// Handle CV results from external service
http.route({
	path: "/cv-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const signature = request.headers.get("x-cv-signature");
		const secretKey = process.env.CV_WEBHOOK_SECRET;

		// TODO: Verify webhook signature
		// if (signature !== expectedSignature) {
		//   return new Response("Unauthorized", { status: 401 });
		// }

		const payload = await request.json();

		try {
			// Store CV results
			await ctx.runMutation(api.cvProcessing.handleCVResults, {
				incidentId: payload.incidentId as any,
				analysisType: payload.type,
				results: payload.results,
				confidence: payload.confidence,
				processingTime: payload.processingTime,
			});

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error: any) {
			console.error("CV webhook error:", error);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	}),
});

// VAPI Webhook - Handle call events
http.route({
	path: "/vapi-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			const message = body.message;

			console.log("[VAPI Webhook] ===== NEW EVENT =====");
			console.log("[VAPI Webhook] Event type:", message.type);
			console.log("[VAPI Webhook] Full payload:", JSON.stringify(body, null, 2));

			// Handle tool calls (submitReport)
			if (message.type === "tool-calls") {
				const results = [];

				console.log("[VAPI Webhook] Tool calls received:", message.toolCallList?.length || 0);

				// Process all tool calls
				for (const toolCall of message.toolCallList || []) {
					console.log("[VAPI Webhook] Processing tool:", toolCall.name);

					if (toolCall.name === "submitReport") {
						const collectedData = toolCall.parameters || toolCall.arguments;
						const callId = message.call?.id;

						console.log("[VAPI Webhook] submitReport data:", JSON.stringify(collectedData, null, 2));

						// Extract incident ID from metadata (transient config)
						const incidentId =
							message.call?.metadata?.incidentId || // From transient config
							message.call?.assistantOverrides?.variableValues?.incidentId || // Legacy
							message.call?.assistant?.metadata?.incidentId; // Permanent assistant

						console.log("[VAPI Webhook] Extracted incidentId:", incidentId);
						console.log("[VAPI Webhook] Call metadata:", message.call?.metadata);

						if (incidentId) {
							// Update incident with collected data
							await ctx.runMutation(api.vapi.updateWithVapiData, {
								incidentId,
								vapiCallId: callId || "unknown",
								collectedData: {
									locationConfirmed: collectedData.locationConfirmed,
									peopleAffected: collectedData.peopleAffected,
									currentStatus: collectedData.currentStatus,
									immediateHazards: collectedData.immediateHazards || [],
									additionalInfo: collectedData.additionalInfo,
								},
							});

							console.log("[VAPI Webhook] ✅ Incident updated with collected data");
						} else {
							console.error("[VAPI Webhook] ❌ No incident ID found in call metadata!");
						}

						// Add result for this tool call
						results.push({
							toolCallId: toolCall.id,
							result: "Report received. Emergency responders have been notified.",
						});
					}
				}

				// Respond to VAPI with all results
				return new Response(
					JSON.stringify({ results }),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			// Handle end of call (get full transcript)
			if (message.type === "end-of-call-report") {
				const callId = message.call?.id;

				console.log("[VAPI Webhook] Call ended. Call ID:", callId);
				console.log("[VAPI Webhook] Artifact structure:", Object.keys(message.artifact || {}));
				console.log("[VAPI Webhook] Message keys:", Object.keys(message));

				// Extract transcript - VAPI sends it in different places
				let transcript = "";

				// Try direct transcript field first
				if (message.transcript) {
					transcript = message.transcript;
					console.log("[VAPI Webhook] Found transcript in message.transcript");
				}
				// Try artifact.transcript
				else if (message.artifact?.transcript) {
					transcript = message.artifact.transcript;
					console.log("[VAPI Webhook] Found transcript in message.artifact.transcript");
				}
				// Try to construct from messages array
				else if (message.artifact?.messages && Array.isArray(message.artifact.messages)) {
					transcript = message.artifact.messages
						.map((msg: any) => `${msg.role}: ${msg.message || msg.content || ""}`)
						.join("\n");
					console.log("[VAPI Webhook] Constructed transcript from messages array");
				}
				// Fallback: stringify entire artifact
				else if (message.artifact) {
					transcript = JSON.stringify(message.artifact, null, 2);
					console.log("[VAPI Webhook] Using stringified artifact as transcript");
				}

				// Extract incident ID from metadata (transient config)
				const incidentId =
					message.call?.metadata?.incidentId || // From transient config
					message.call?.assistantOverrides?.variableValues?.incidentId || // Legacy
					message.call?.assistant?.metadata?.incidentId; // Permanent assistant

				console.log("[VAPI Webhook] Transcript length:", transcript.length);
				console.log("[VAPI Webhook] Extracted incidentId:", incidentId);
				console.log("[VAPI Webhook] Call metadata:", message.call?.metadata);

				if (incidentId) {
					// Update incident with transcript
					await ctx.runMutation(api.vapi.updateVapiTranscript, {
						incidentId,
						transcript,
						vapiCallStatus: "completed",
					});

					console.log("[VAPI Webhook] ✅ Transcript saved");

					// Trigger Grok analysis with VAPI data
					try {
						await ctx.runAction(api.ai.analyzeIncidentWithVapiData, {
							incidentId,
						});
						console.log("[VAPI Webhook] ✅ Triggered Grok analysis");
					} catch (analysisError: any) {
						console.error("[VAPI Webhook] ❌ Grok analysis failed:", analysisError.message);
						// Continue even if analysis fails
					}
				} else {
					console.error("[VAPI Webhook] ❌ No incident ID found - cannot save transcript!");
				}

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			// Handle status updates
			if (message.type === "status-update") {
				console.log("[VAPI Webhook] Status update:", message.status);
				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			// Log unhandled event types
			console.log("[VAPI Webhook] Unhandled event type:", message.type);

			// Default response for other events
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error: any) {
			console.error("[VAPI Webhook] ❌ Error:", error);
			console.error("[VAPI Webhook] Stack:", error.stack);
			return new Response(
				JSON.stringify({ error: error.message }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	}),
});

export default http;
