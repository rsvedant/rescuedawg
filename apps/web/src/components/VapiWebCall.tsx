"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import Vapi from "@vapi-ai/web";
import { useAction, useMutation } from "convex/react";
import { api } from "@rescuedawg/backend/convex/_generated/api";
import type { Id } from "@rescuedawg/backend/convex/_generated/dataModel";

interface EmergencyContext {
	incidentId: string;
	firstMessage: string;
	emergency: {
		type: string;
		confidence: number;
		description: string;
		severity: string;
	};
	location?: string;
}

interface VapiWebCallProps {
	onCallStart?: () => void;
	onCallEnd?: () => void;
	emergencyContext: EmergencyContext;
	assistantId?: string;
}

export function VapiWebCall({
	onCallStart,
	onCallEnd,
	emergencyContext,
	assistantId,
}: VapiWebCallProps) {
	const vapiRef = useRef<Vapi | null>(null);
	const [isCallActive, setIsCallActive] = useState(false);
	const [callStatus, setCallStatus] = useState<string>("idle");
	const [transcript, setTranscript] = useState<string>("");
	const callStartTimeRef = useRef<number>(0);

	// Backend mutations/actions
	const storeSampleAssessment = useMutation(api.vapiSample.storeSampleAssessment);
	const updateCallTranscript = useMutation(api.vapiSample.updateCallTranscript);

	// Handle VAPI function calls
	const handleFunctionCall = async (functionCall: any) => {
		if (functionCall.name === "submitSampleReport") {
			try {
				const args = functionCall.parameters;
				console.log("[VAPI] Storing SAMPLE assessment:", args);

				await storeSampleAssessment({
					incidentId: emergencyContext.incidentId as Id<"incidents">,
					patientStatus: args.patientStatus,
					signsSymptoms: args.signsSymptoms,
					allergies: args.allergies,
					medications: args.medications,
					preExistingConditions: args.preExistingConditions,
					lastOralIntake: args.lastOralIntake,
					eventsLeadingUp: args.eventsLeadingUp,
					focusedChecks: args.focusedChecks,
					transcript: args.transcript,
					summary: args.summary,
					assessmentStarted: callStartTimeRef.current,
					assessmentCompleted: Date.now(),
				});

				console.log("[VAPI] SAMPLE assessment stored successfully");
			} catch (error) {
				console.error("[VAPI] Failed to store SAMPLE assessment:", error);
			}
		}

		if (functionCall.name === "endCall") {
			console.log("[VAPI] AI requested call termination");
			setTimeout(() => {
				if (vapiRef.current) {
					vapiRef.current.stop();
					console.log("[VAPI] Call ended by AI");
				}
			}, 1000);
		}
	};

	useEffect(() => {
		// Initialize VAPI on mount
		if (typeof window === "undefined") return;
		if (vapiRef.current) return;

		try {
			const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
			if (!publicKey) {
				console.error("[VAPI] Public key not configured");
				return;
			}

			vapiRef.current = new Vapi(publicKey);
			console.log("[VAPI] SDK initialized");

			// Setup event listeners
			vapiRef.current.on("call-start", () => {
				console.log("[VAPI] Call started");
				setIsCallActive(true);
				setCallStatus("active");
				callStartTimeRef.current = Date.now();
				setTranscript("");
				onCallStart?.();
			});

			vapiRef.current.on("call-end", async () => {
				console.log("[VAPI] Call ended");
				setIsCallActive(false);
				setCallStatus("ended");

				// Save transcript and call duration
				if (callStartTimeRef.current > 0) {
					const callDuration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
					try {
						await updateCallTranscript({
							incidentId: emergencyContext.incidentId as Id<"incidents">,
							transcript: transcript || "No transcript captured",
							callDuration,
							callEndedAt: Date.now(),
						});
						console.log("[VAPI] Transcript saved to incident");
					} catch (error) {
						console.error("[VAPI] Failed to save transcript:", error);
					}
				}

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

				// Capture transcript messages
				if (message.type === "transcript" && message.transcript) {
					const line = `${message.role}: ${message.transcript}`;
					console.log(`[VAPI] ${line}`);
					setTranscript(prev => prev ? `${prev}\n${line}` : line);
				}

				// Handle function calls (submitSampleReport)
				if (message.type === "function-call" && message.functionCall) {
					console.log("[VAPI] Function call:", message.functionCall);
					handleFunctionCall(message.functionCall);
				}
			});

			vapiRef.current.on("error", (error: any) => {
				console.error("[VAPI] Error event:", error);
				setCallStatus("error");
			});

			console.log("[VAPI] Event listeners registered");
		} catch (error) {
			console.error("[VAPI] Initialization failed:", error);
		}

		return () => {
			// Cleanup on unmount
			if (vapiRef.current && isCallActive) {
				try {
					vapiRef.current.stop();
				} catch (e) {
					console.warn("[VAPI] Cleanup error:", e);
				}
			}
		};
	}, []);

	const startCall = async () => {
		if (!vapiRef.current) {
			console.error("[VAPI] SDK not initialized");
			return;
		}

		try {
			setCallStatus("starting");

			if (assistantId) {
				// Use pre-configured assistant with metadata
				console.log(`[VAPI] Starting with assistant ${assistantId}`);
				await vapiRef.current.start(assistantId, {
					metadata: {
						incidentId: emergencyContext.incidentId,
						emergencyType: emergencyContext.emergency.type,
						confidence: emergencyContext.emergency.confidence,
					},
				});
			} else {
				// Generate SAMPLE protocol prompt
				console.log("[VAPI] Generating SAMPLE protocol prompt...");

				console.log("[VAPI] SAMPLE prompt generated");

				// Use transient assistant with SAMPLE protocol
				const config: any = {
					// Model configuration
					model: {
						provider: "openai",
						model: "gpt-4o",
						tools: [
							{
								type: "function",
								function: {
									name: "submitSampleReport",
									description:
										"Submit the completed SAMPLE assessment to the system",
									parameters: {
										type: "object",
										properties: {
											patientStatus: {
												type: "string",
												enum: ["conscious", "unconscious", "partially_responsive"],
												description: "Patient consciousness level",
											},
											signsSymptoms: {
												type: "object",
												properties: {
													patientReported: { type: "string" },
													observedSigns: {
														type: "array",
														items: { type: "string" },
													},
												},
												required: ["patientReported", "observedSigns"],
											},
											allergies: {
												type: "object",
												properties: {
													known: {
														type: "array",
														items: { type: "string" },
													},
													unknown: { type: "boolean" },
												},
												required: ["known", "unknown"],
											},
											medications: {
												type: "object",
												properties: {
													current: {
														type: "array",
														items: {
															type: "object",
															properties: {
																name: { type: "string" },
																lastTaken: { type: "string" },
															},
														},
													},
													unknown: { type: "boolean" },
												},
												required: ["current", "unknown"],
											},
											preExistingConditions: {
												type: "object",
												properties: {
													conditions: {
														type: "array",
														items: { type: "string" },
													},
													unknown: { type: "boolean" },
												},
												required: ["conditions", "unknown"],
											},
											lastOralIntake: {
												type: "object",
												properties: {
													food: { type: "string" },
													time: { type: "string" },
													unknown: { type: "boolean" },
												},
												required: ["unknown"],
											},
											eventsLeadingUp: {
												type: "object",
												properties: {
													description: { type: "string" },
													activity: { type: "string" },
													previousOccurrence: { type: "boolean" },
												},
												required: ["description", "previousOccurrence"],
											},
											focusedChecks: {
												type: "object",
												properties: {
													fastScreen: {
														type: "object",
														properties: {
															faceSymmetry: { type: "string" },
															armStrength: { type: "string" },
															speechClarity: { type: "string" },
														},
													},
													bloodSugarClue: { type: "string" },
													heatExertionClue: { type: "string" },
												},
											},
											transcript: {
												type: "string",
												description: "Full conversation transcript",
											},
											summary: {
												type: "string",
												description: "Brief assessment summary for EMS",
											},
										},
										required: [
											"patientStatus",
											"signsSymptoms",
											"allergies",
											"medications",
											"preExistingConditions",
											"lastOralIntake",
											"eventsLeadingUp",
											"transcript",
											"summary",
										],
									},
								},
							},
						],
					},

					// Transcriber configuration
					transcriber: {
						provider: "deepgram",
						model: "nova-2",
						language: "en",
					},

					// Name for identification
					name: `SAMPLE-${emergencyContext.incidentId}`,

					// Metadata
					metadata: {
						incidentId: emergencyContext.incidentId,
						emergencyType: emergencyContext.emergency.type,
						confidence: emergencyContext.emergency.confidence,
						protocol: "SAMPLE",
					},
				};

				console.log("[VAPI] Starting SAMPLE assessment call");
				await vapiRef.current.start(config);
			}

			console.log("[VAPI] Start command sent");
		} catch (error: any) {
			console.error("[VAPI] Failed to start call:", error);
			setCallStatus("error");
		}
	};

	const endCall = async () => {
		if (!vapiRef.current) return;

		try {
			setCallStatus("ending");
			vapiRef.current.stop();
		} catch (error) {
			console.error("[VAPI] Error stopping call:", error);
		}
	};

	return (
		<>
			{/* MASSIVE END CALL BUTTON - Fixed at top center */}
			{isCallActive && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
					<button
						onClick={endCall}
						disabled={callStatus === "ending"}
						className="px-12 py-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-2xl font-black transition-all animate-pulse shadow-2xl border-4 border-white transform hover:scale-105 disabled:opacity-50"
					>
						<span>🛑 END CALL NOW 🛑</span>
					</button>
				</div>
			)}

			{/* Bottom-right controls (backup) */}
			<div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
				{/* Call status indicator */}
				{isCallActive && (
					<div className="bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
						<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						SAMPLE Assessment Active
					</div>
				)}

				{/* Manual call control button */}
				<button
					onClick={isCallActive ? endCall : startCall}
					disabled={callStatus === "starting" || callStatus === "ending"}
					className={`px-6 py-4 rounded-lg shadow-lg transition-all flex items-center gap-3 font-semibold ${
						isCallActive
							? "bg-red-600 hover:bg-red-700 text-white"
							: "bg-green-600 hover:bg-green-700 text-white"
					} disabled:opacity-50 disabled:cursor-not-allowed`}
					aria-label={isCallActive ? "End call" : "Start call"}
				>
					{isCallActive ? (
						<>
							<PhoneOff className="w-5 h-5" />
							<span>End Call</span>
						</>
					) : (
						<>
							<Phone className="w-5 h-5" />
							<span>Start Call</span>
						</>
					)}
				</button>

				{/* Error indicator */}
				{callStatus === "error" && (
					<div className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-medium">
						Call error - check console
					</div>
				)}
			</div>
		</>
	);
}
