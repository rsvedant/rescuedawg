"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";

interface EmergencyContext {
	incidentId: string;
	systemPrompt: string;
	firstMessage: string;
	emergency: {
		type: string;
		confidence: number;
		description: string;
		severity: string;
	};
}

interface VapiWebCallProps {
	onCallStart?: () => void;
	onCallEnd?: () => void;
	emergencyContext: EmergencyContext;
	assistantId?: string; // Optional - for fallback to permanent assistant
}

export function VapiWebCall({
	onCallStart,
	onCallEnd,
	emergencyContext,
	assistantId,
}: VapiWebCallProps) {
	const vapiRef = useRef<any>(null);
	const [isCallActive, setIsCallActive] = useState(false);
	const listenersSetup = useRef(false);

	useEffect(() => {
		// Load VAPI Web SDK
		const loadVapi = async () => {
			if (typeof window === "undefined") return;
			if (vapiRef.current || listenersSetup.current) {
				console.log("[VAPI] Already initialized");
				return;
			}

			try {
				const Vapi = (await import("@vapi-ai/web")).default;
				vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
				console.log("[VAPI] SDK loaded successfully");

				// Setup event listeners ONCE during initialization
				vapiRef.current.on("call-start", () => {
					console.log("[VAPI] Call started");
					setIsCallActive(true);
					onCallStart?.();
				});

				vapiRef.current.on("call-end", () => {
					console.log("[VAPI] Call ended");
					setIsCallActive(false);
					onCallEnd?.();
				});

				vapiRef.current.on("speech-start", () => {
					console.log("[VAPI] User started speaking");
				});

				vapiRef.current.on("speech-end", () => {
					console.log("[VAPI] User stopped speaking");
				});

				vapiRef.current.on("message", (message: any) => {
					console.log("[VAPI] Message:", message);
					if (message.type === 'transcript' && message.transcript) {
						console.log(`[VAPI] ${message.role}: ${message.transcript}`);
					}
				});

				vapiRef.current.on("error", (error: any) => {
					console.error("[VAPI] Error:", error);
					// Handle empty error objects
					const errorMsg = error?.message || error?.error || JSON.stringify(error) || 'Unknown error';
					console.error("[VAPI] Error details:", errorMsg);
				});

				listenersSetup.current = true;
				console.log("[VAPI] Event listeners registered");
			} catch (error) {
				console.error("[VAPI] Failed to load SDK:", error);
			}
		};

		loadVapi();

		return () => {
			if (vapiRef.current) {
				try {
					vapiRef.current.stop();
					console.log("[VAPI] Cleanup complete");
				} catch (e) {
					// Ignore cleanup errors
				}
			}
		};
	}, [onCallStart, onCallEnd]);

	const startCall = () => {
		if (!vapiRef.current) {
			console.error("[VAPI] SDK not initialized");
			return;
		}

		try {
			// Use transient assistant configuration with emergency-specific context
			const config: any = {
				transcriber: {
					provider: "deepgram",
					model: "nova-2",
					language: "en",
				},
				model: {
					provider: "openai",
					model: "gpt-4",
					messages: [
						{
							role: "system",
							content: emergencyContext.systemPrompt,
						},
					],
					tools: [
						{
							type: "function",
							function: {
								name: "submitReport",
								description: "Submit collected emergency information to dispatch",
								parameters: {
									type: "object",
									properties: {
										locationConfirmed: {
											type: "string",
											description: "Exact address confirmed by caller",
										},
										peopleAffected: {
											type: "number",
											description: "Number of people affected or injured",
										},
										currentStatus: {
											type: "string",
											description:
												"Current status: worsening, stable, or improving",
										},
										immediateHazards: {
											type: "array",
											items: { type: "string" },
											description: "List of immediate hazards for responders",
										},
										additionalInfo: {
											type: "string",
											description: "Any additional critical information",
										},
									},
									required: [
										"locationConfirmed",
										"peopleAffected",
										"currentStatus",
										"immediateHazards",
									],
								},
							},
						},
					],
				},
				voice: {
					provider: "11labs",
					voiceId: process.env.NEXT_PUBLIC_VAPI_VOICE_ID || "rachel",
				},
				firstMessage: emergencyContext.firstMessage,
				// Pass metadata for webhook to extract incidentId
				metadata: {
					incidentId: emergencyContext.incidentId,
					emergencyType: emergencyContext.emergency.type,
					confidence: emergencyContext.emergency.confidence,
				},
			};

			console.log(
				`[VAPI] Starting call for incident ${emergencyContext.incidentId}`,
			);

			// If assistantId provided, use it as fallback
			if (assistantId) {
				vapiRef.current.start(assistantId, config);
			} else {
				// Use fully transient assistant
				vapiRef.current.start(config);
			}

			console.log("[VAPI] Call start command sent");
		} catch (error: any) {
			console.error("[VAPI] Failed to start call:", error);
			const errorMsg = error?.message || error?.error || 'Unknown error';
			console.error("[VAPI] Start error details:", errorMsg);
		}
	};

	const endCall = () => {
		if (vapiRef.current) {
			vapiRef.current.stop();
		}
	};

	return (
		<div className="fixed bottom-8 right-8 z-50">
			<button
				onClick={isCallActive ? endCall : startCall}
				className={`p-4 rounded-full shadow-lg transition-all ${
					isCallActive
						? "bg-red-600 hover:bg-red-700 animate-pulse"
						: "bg-green-600 hover:bg-green-700"
				}`}
				aria-label={isCallActive ? "End call" : "Start call"}
			>
				{isCallActive ? (
					<PhoneOff className="w-6 h-6 text-white" />
				) : (
					<Phone className="w-6 h-6 text-white" />
				)}
			</button>
			{isCallActive && (
				<div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
			)}
		</div>
	);
}
