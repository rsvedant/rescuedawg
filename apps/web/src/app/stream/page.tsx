"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@rescuedawg/backend/convex/_generated/api";
import type { Id } from "@rescuedawg/backend/convex/_generated/dataModel";
import type { AnalysisResponse, Emergency } from "@rescuedawg/backend/convex/videoAnalysis";
import { Video, Square, Play, AlertCircle } from "lucide-react";
import { Room, LocalVideoTrack } from "livekit-client";
import Vapi from "@vapi-ai/web";

// Type for analysis results (includes error states)
type AnalysisResult = AnalysisResponse & {
	error?: string;
	rawResponse?: string;
};

export default function StreamPage() {
	const [isStreaming, setIsStreaming] = useState(false);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [status, setStatus] = useState("");
	const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
	const [debugLog, setDebugLog] = useState<string[]>([]);
	const [currentFrame, setCurrentFrame] = useState<string | null>(null);
	const socketRef = useRef<any>(null);
	const dogCamRoomRef = useRef<Room | null>(null);
	const [dogCamTrack, setDogCamTrack] = useState<LocalVideoTrack | null>(null);
	const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const deviceIdRef = useRef<string | null>(null);
	// Stop further CV requests after first high-confidence detection
	const detectionLockedRef = useRef<boolean>(false);
	// Emergency state for visual feedback
	const [isEmergencyActive, setIsEmergencyActive] = useState(false);
	// Cache emergency context for later Vapi transient overrides
	const vapiContextRef = useRef<{
		feedId: string;
		emergency: Emergency & { detectedAt: number };
		callContext?: any;
		text?: any;
	} | null>(null);

	const addDebugLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setDebugLog(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
		console.log(message);
	};

	const registerFeed = useMutation(api.videoFeeds.register);
	const deregisterFeed = useMutation(api.videoFeeds.deregister);
	const createIncident = useMutation(api.videoAlerts.createWithIncident);
	const prepareCall = useAction(api.vapi.prepareEmergencyContext);
	const generateToken = useAction(api.livekit.generateToken);

	// SAMPLE protocol functions
	const generateSamplePrompt = useAction(api.vapiSample.generateSamplePrompt);
	const storeSampleAssessment = useMutation(api.vapiSample.storeSampleAssessment);
	const updateCallTranscript = useMutation(api.vapiSample.updateCallTranscript);

	// Initialize VAPI instance
	const vapiRef = useRef<Vapi | null>(null);
	const vapiListenersSetup = useRef(false);
	const [vapiTranscript, setVapiTranscript] = useState<string>("");
	const vapiCallStartTimeRef = useRef<number>(0);
	const currentIncidentIdRef = useRef<string | null>(null);

	// Handle SAMPLE assessment submission
	const handleSampleReport = async (parameters: any) => {
		if (!currentIncidentIdRef.current) {
			console.error("[SAMPLE] No incident ID to store assessment");
			return;
		}

		try {
			addDebugLog("💾 Storing SAMPLE assessment...");
			await storeSampleAssessment({
				incidentId: currentIncidentIdRef.current as Id<"incidents">,
				patientStatus: parameters.patientStatus,
				signsSymptoms: parameters.signsSymptoms,
				allergies: parameters.allergies,
				medications: parameters.medications,
				preExistingConditions: parameters.preExistingConditions,
				lastOralIntake: parameters.lastOralIntake,
				eventsLeadingUp: parameters.eventsLeadingUp,
				focusedChecks: parameters.focusedChecks,
				transcript: parameters.transcript,
				summary: parameters.summary,
				assessmentStarted: vapiCallStartTimeRef.current,
				assessmentCompleted: Date.now(),
			});
			addDebugLog("✅ SAMPLE assessment stored successfully");
		} catch (error: any) {
			console.error("[SAMPLE] Failed to store assessment:", error);
			addDebugLog(`❌ Failed to store SAMPLE: ${error.message}`);
		}
	};

	useEffect(() => {
		// Initialize Vapi with public key
		if (!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
			console.error('[VAPI] Public key not found');
			return;
		}

		if (vapiRef.current || vapiListenersSetup.current) {
			console.log('[VAPI] Already initialized');
			return;
		}

		try {
			vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
			console.log('[VAPI] SDK initialized');

			// Setup event listeners ONCE during initialization
			vapiRef.current.on('call-start', () => {
				console.log('[VAPI] Call started');
				addDebugLog("✅ VAPI call connected - SAMPLE assessment beginning");
				vapiCallStartTimeRef.current = Date.now();
				setVapiTranscript("");
			});

			vapiRef.current.on('call-end', async () => {
				console.log('[VAPI] Call ended');
				addDebugLog("📴 VAPI call ended - saving transcript");
				setStatus("Call completed - saving data");

				// Save transcript if we have one
				if (currentIncidentIdRef.current && vapiCallStartTimeRef.current > 0) {
					const callDuration = Math.floor((Date.now() - vapiCallStartTimeRef.current) / 1000);
					try {
						await updateCallTranscript({
							incidentId: currentIncidentIdRef.current as Id<"incidents">,
							transcript: vapiTranscript || "No transcript captured",
							callDuration,
							callEndedAt: Date.now(),
						});
						addDebugLog("✅ Transcript saved to incident");
					} catch (error: any) {
						console.error("[VAPI] Failed to save transcript:", error);
						addDebugLog(`❌ Failed to save transcript: ${error.message}`);
					}
				}

				// Reset emergency visual state
				setIsEmergencyActive(false);

				// Reset lock after call ends
				setTimeout(() => {
					detectionLockedRef.current = false;
					currentIncidentIdRef.current = null;
				}, 5000);
			});

			vapiRef.current.on('speech-start', () => {
				console.log('[VAPI] Assistant speaking');
				addDebugLog("🗣️ Assistant speaking");
			});

			vapiRef.current.on('speech-end', () => {
				console.log('[VAPI] Assistant finished');
				addDebugLog("🤫 Assistant finished");
			});

			vapiRef.current.on('message', (message: any) => {
				console.log('[VAPI] Message:', message);

				// Capture transcripts
				if (message.type === 'transcript' && message.transcript) {
					const line = `${message.role}: ${message.transcript}`;
					addDebugLog(`💬 ${line}`);
					setVapiTranscript(prev => prev ? `${prev}\n${line}` : line);
				}

				// Handle SAMPLE function calls
				if (message.type === 'function-call' && message.functionCall) {
					console.log('[VAPI] Function call received:', message.functionCall);
					addDebugLog(`🔧 Function call: ${message.functionCall.name}`);

					if (message.functionCall.name === 'submitSampleReport') {
						handleSampleReport(message.functionCall.parameters);
					}

					// Handle endCall - AI requests to terminate the call
					if (message.functionCall.name === 'endCall') {
						addDebugLog("📞 AI requested call termination");
						setTimeout(() => {
							if (vapiRef.current) {
								vapiRef.current.stop();
								addDebugLog("✅ Call ended by AI");
							}
						}, 1000); // Small delay to let the AI finish speaking
					}
				}
			});

			vapiRef.current.on('error', (error: any) => {
				console.error('[VAPI] Error:', error);
				const errorMsg = error?.message || error?.error || JSON.stringify(error) || 'Unknown error';
				addDebugLog(`❌ VAPI error: ${errorMsg}`);
			});

			vapiListenersSetup.current = true;
			console.log('[VAPI] Event listeners registered');
		} catch (error: any) {
			console.error('[VAPI] Initialization failed:', error);
			addDebugLog(`❌ VAPI init failed: ${error.message}`);
		}

		return () => {
			// Cleanup: stop any active calls
			if (vapiRef.current) {
				try {
					vapiRef.current.stop();
					console.log('[VAPI] Cleanup complete');
				} catch (e: any) {
					console.warn('[VAPI] Cleanup error:', e?.message || e);
				}
			}
		};
	}, []);

	// Setup Socket.IO connection for video stream
	useEffect(() => {
		if (!isStreaming) return;

		// Load Socket.IO script if not already loaded
		if (typeof window !== 'undefined' && !(window as any).io) {
			const script = document.createElement('script');
			script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
			script.async = true;
			script.onload = () => {
				initializeSocket();
			};
			document.body.appendChild(script);
		} else {
			initializeSocket();
		}

		function initializeSocket() {
			if (typeof window === 'undefined' || !(window as any).io) return;

			const io = (window as any).io;
			
			// Connect with proper configuration for ngrok
			const socket = io('https://hachicctv.aadil.site', {
				transports: ['websocket', 'polling'],
				reconnection: true,
				reconnectionDelay: 1000,
				reconnectionAttempts: 5,
				extraHeaders: {
					'ngrok-skip-browser-warning': 'true'
				}
			});
			
			socketRef.current = socket;

			socket.on('connect', () => {
				console.log('Socket.IO connected');
				addDebugLog('🔌 Socket.IO connected');
				socket.emit('start_stream');
			});

			socket.on('video_frame', (data: { image: string }) => {
				setCurrentFrame('data:image/jpeg;base64,' + data.image);
			});

			socket.on('fall_detected', async (data: { timestamp: string }) => {
				console.log('Fall detected at:', data.timestamp);
				addDebugLog(`🚨 Fall detected at ${data.timestamp}`);
				
				// Check if we're already handling an emergency
				if (detectionLockedRef.current) {
					addDebugLog("⛔ Already handling emergency, ignoring");
					return;
				}

				// Lock detection immediately
				detectionLockedRef.current = true;
				setStatus("Fall detected - initiating emergency call");

				try {
					// Create incident in database
					const feedId = deviceIdRef.current || 'websocket-fall-detection';
					deviceIdRef.current = feedId;
					
					await registerFeed({ 
						feedId,
						deviceId: feedId,
						name: "Fall Detection WebSocket",
						location: {
							address: "Y Combinator, 335 Pioneer Way, Mountain View, CA 94041",
							coordinates: { lat: 37.3861, lon: -122.0839 }
						}
					});

					addDebugLog("📝 Creating incident report...");
				
				// Prepare emergency context
				const emergency = {
					type: "medical",
					confidence: 0.95,
					description: `Fall detected via pose estimation at ${data.timestamp}`,
					severity: "critical"
				};

				// Create incident directly via Convex mutation
				const incidentData = await createIncident({
					feedId,
					alertType: "medical",
					confidence: 0.95,
					description: `Fall detected via pose estimation at ${data.timestamp}`
				});
				
				if (incidentData.incidentId) {
					addDebugLog(`✅ Incident ${incidentData.incidentId} created, starting VAPI call...`);

					// Get emergency context with system prompt from backend
					addDebugLog("📝 Preparing emergency context...");
					const emergencyContext = await prepareCall({
						incidentId: incidentData.incidentId,
						emergency,
						feedId,
					});

					// Start VAPI call
					if (!vapiRef.current) {
						addDebugLog("❌ VAPI not initialized");
						return;
					}

					// Use transient assistant configuration with emergency-specific context
					const config: any = {
						name: `Fall-${Date.now()}`,
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
													description: "Current status: worsening, stable, or improving",
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
						firstMessage: emergencyContext.firstMessage,
						// Pass metadata for webhook to extract incidentId
						metadata: {
							incidentId: emergencyContext.incidentId,
							emergencyType: emergency.type,
							confidence: emergency.confidence,
						},
					};

					try {
						// Start call with transient configuration
						vapiRef.current.start(config);
						addDebugLog("📞 VAPI call initiated with transient config");
						setStatus("Emergency call in progress");
					} catch (callError: any) {
						console.error('[VAPI] Failed to start call:', callError);
						addDebugLog(`❌ Call start failed: ${callError.message || 'Unknown error'}`);
						detectionLockedRef.current = false;
					}
				} else {
					addDebugLog("❌ Failed to create incident");
					detectionLockedRef.current = false;
				}
			} catch (error: any) {
				console.error("Fall detection error:", error);
				addDebugLog(`❌ Error: ${error.message}`);
				detectionLockedRef.current = false;
			}
		});

			socket.on('disconnect', () => {
				console.log('Socket.IO disconnected');
				addDebugLog('🔌 Socket.IO disconnected');
			});

			socket.on('connect_error', (error: any) => {
				console.error('Socket.IO connection error:', error);
				addDebugLog(`❌ Connection error: ${error.message || 'Unknown'}`);
			});

			socket.on('error', (error: any) => {
				console.error('Socket.IO error:', error);
				addDebugLog(`❌ Socket error: ${error.message || 'Unknown'}`);
			});
		}

		return () => {
			if (socketRef.current) {
				addDebugLog('🔌 Disconnecting Socket.IO');
				socketRef.current.emit('stop_stream');
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			setCurrentFrame(null);
		};
	}, [isStreaming]);

	useEffect(() => {
		return () => {
			// Cleanup on unmount
			console.log("[Stream] Component unmounting, cleaning up...");

			if (deviceIdRef.current) {
				deregisterFeed({ feedId: deviceIdRef.current }).catch((err) =>
					console.error("Cleanup deregister error:", err)
				);
			}

			if (analysisIntervalRef.current) {
				clearInterval(analysisIntervalRef.current);
			}

			// Cleanup LiveKit Room
			if (dogCamRoomRef.current) {
				dogCamRoomRef.current.disconnect();
				console.log("[LiveKit] Dog cam room disconnected on cleanup");
			}
		};
	}, [deregisterFeed]);

	const startStreaming = async () => {
		try {
			setStatus("Connecting to video feed...");

			// Generate unique device ID with dogview pattern
			const deviceId = "dogview-" + crypto.randomUUID();
			deviceIdRef.current = deviceId;
			console.log("[Stream] Starting with deviceId:", deviceId);

			// Register feed in database
			setStatus("Registering video feed...");
			await registerFeed({
				feedId: deviceId,
				deviceId,
				name: "External Security Camera",
				location: {
					address: "Remote Location",
					coordinates: { lat: 37.7749, lon: -122.4194 },
				},
			});
			console.log("[Stream] Feed registered in database");

			// Set up LiveKit webcam "dog view"
			setStatus("Connecting dog cam...");
			const token = await generateToken({
				identity: deviceId, // Use dogview-UUID as identity
				roomName: "emergency-feeds", // Unified room for all feeds
			});

			const room = new Room();
			dogCamRoomRef.current = room;

			await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
			console.log("[LiveKit] Dog cam connected to room");

			// Enable webcam with back camera (environment)
			// Use "environment" for back camera, "user" for front camera
			await room.localParticipant.setCameraEnabled(true, {
				facingMode: "environment", // Use back camera
			});
			const videoTrack = room.localParticipant.videoTrackPublications.values().next().value?.track;
			if (videoTrack && videoTrack instanceof LocalVideoTrack) {
				setDogCamTrack(videoTrack);
				console.log("[LiveKit] Dog cam video track published (back camera)");
			}

			setIsStreaming(true);
			setStatus("Streaming active - Fall detection via WebSocket");

			// AI frame analysis disabled - using WebSocket fall_detected events instead
			// startFrameAnalysis(deviceId);
		} catch (error: any) {
			console.error("[Stream] Streaming error:", error);
			setStatus(`Error: ${error.message}`);
		}
	};

	const stopStreaming = async () => {
		console.log("[Stream] Stopping stream...");

		// Deregister feed from database
		if (deviceIdRef.current) {
			try {
				await deregisterFeed({ feedId: deviceIdRef.current });
				console.log("[Stream] Feed deregistered from database");
			} catch (error) {
				console.error("[Stream] Failed to deregister feed:", error);
			}
			deviceIdRef.current = null;
		}


		if (analysisIntervalRef.current) {
			clearInterval(analysisIntervalRef.current);
			analysisIntervalRef.current = null;
			console.log("[Stream] Stopped analysis interval");
		}

		// Disconnect LiveKit dog cam
		if (dogCamRoomRef.current) {
			dogCamRoomRef.current.disconnect();
			dogCamRoomRef.current = null;
			setDogCamTrack(null);
			console.log("[LiveKit] Dog cam disconnected");
		}

		// Reset detection lock and cached context
		detectionLockedRef.current = false;
		vapiContextRef.current = null;

		setIsStreaming(false);
		setIsAnalyzing(false);
		setStatus("Stopped");
		setLastAnalysis(null);
	};

	const startFrameAnalysis = (feedId: string) => {
		setIsAnalyzing(true);
		let samplingInterval = 5000; // 5 seconds for responsive detection

		// Extract and analyze frames periodically
		const analyze = async () => {
			if (detectionLockedRef.current) {
				addDebugLog("⛔ Detection locked; skipping analysis");
				return;
			}
			
			// Check if we have a current frame from Socket.IO
			if (!currentFrame) {
				addDebugLog("⏳ Waiting for video frame from Socket.IO...");
				return;
			}

			addDebugLog("🎬 Starting frame analysis");
			try {
				// Use the current frame from Socket.IO (already in base64 data URL format)
				addDebugLog(`✅ Using current frame from Socket.IO`);

				// Load image and resize to reduce payload
				const img = new Image();
				
				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = reject;
					img.src = currentFrame;
				});

				// Create canvas and resize image (max 800px width)
				const canvas = document.createElement("canvas");
				const maxWidth = 800;
				const scale = Math.min(1, maxWidth / img.width);
				canvas.width = img.width * scale;
				canvas.height = img.height * scale;
				
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					addDebugLog("❌ Canvas context failed");
					return;
				}

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
				addDebugLog(`🖼️ Frame resized and compressed (${Math.round(dataUrl.length / 1024)}KB)`);

				// Send to analysis API
				addDebugLog("📤 Sending to API...");
				const analysisResponse = await fetch("/api/analyze-frame", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ feedId, frameDataUrl: dataUrl }),
				});

				addDebugLog(`📥 Response: ${analysisResponse.status}`);
				const result = await analysisResponse.json();
				addDebugLog(`📊 Result: ${JSON.stringify(result).substring(0, 100)}...`);
				console.log("[Stream] Full API response:", result);
				console.log("[Stream] Analysis structure:", result.analysis);

				// Check for errors
				if (!analysisResponse.ok || result.error) {
					addDebugLog(`❌ Error: ${result.error || "API failed"}`);
					console.error("Analysis error:", result.error);
					setLastAnalysis({
						emergencies: [],
						requiresImmediateAction: false,
						error: result.error || "Analysis failed",
					});
					return;
				}

				// Check if analysis has expected structure
				if (!result.analysis || !result.analysis.emergencies) {
					addDebugLog("❌ Invalid structure");
					console.error("Invalid analysis structure:", result.analysis);
					setLastAnalysis({
						emergencies: [],
						requiresImmediateAction: false,
						error: "Invalid analysis structure received",
					});
					return;
				}

				const emergencyCount = result.analysis.emergencies.length;
				const hasEmergency = result.analysis.emergencies.some((e: Emergency) => e.type !== "none");
				addDebugLog(`✅ Analysis OK: ${emergencyCount} items, emergency: ${hasEmergency}`);

				setLastAnalysis(result.analysis);

				// Check lock again before proceeding (in case another request triggered VAPI)
				if (detectionLockedRef.current) {
					addDebugLog("⛔ Detection locked during analysis; aborting");
					return;
				}

				// If high-confidence emergency detected, stop further requests and trigger VAPI
				// Require >92% confidence AND high/critical severity to reduce false positives
				const highConfidence = result.analysis.emergencies.find((e: Emergency) => 
					e.type !== "none" && 
					e.confidence > 0.92 &&
					(e.severity === "high" || e.severity === "critical")
				);
				if (result.analysis.requiresImmediateAction && highConfidence && result.analysis.incidentId) {
					// IMMEDIATELY lock and stop all analysis to prevent race conditions
					detectionLockedRef.current = true;
					if (analysisIntervalRef.current) {
						clearInterval(analysisIntervalRef.current);
						analysisIntervalRef.current = null;
						setIsAnalyzing(false);
					}
					
					addDebugLog("🚨 High-confidence emergency detected. Initiating SAMPLE assessment call...");
					setStatus("Emergency detected – initiating SAMPLE assessment");

					// Activate emergency visual state (red background)
					setIsEmergencyActive(true);

					vapiContextRef.current = {
						feedId,
						emergency: { ...highConfidence, detectedAt: Date.now() },
					};

					// Store incident ID for later use
					currentIncidentIdRef.current = result.analysis.incidentId;

					// Initiate VAPI web call with SAMPLE protocol
					try {
						// Use the initialized VAPI instance
						if (!vapiRef.current) {
							addDebugLog("❌ VAPI not initialized");
							return;
						}

						// Generate SAMPLE protocol prompt
						addDebugLog("📝 Generating SAMPLE assessment prompt...");
						const samplePrompt = await generateSamplePrompt({
							incidentId: result.analysis.incidentId as Id<"incidents">,
							incidentType: highConfidence.type,
							location: "Location detected from camera feed", // TODO: Get actual location
						});

						addDebugLog("📞 Starting SAMPLE assessment call...");
						setStatus("SAMPLE assessment - please speak");

						// Use transient assistant configuration with SAMPLE protocol
						const config: any = {
							name: `SAMPLE-${result.analysis.incidentId}`,
							transcriber: {
								provider: "deepgram",
								model: "nova-2",
								language: "en",
							},
							model: {
								provider: "openai",
								model: "gpt-4o",
								messages: [
									{
										role: "system",
										content: samplePrompt.systemPrompt,
									},
								],
								tools: [
									{
										type: "function",
										function: {
											name: "endCall",
											description: "End the emergency assessment call after completing the SAMPLE report",
											parameters: {
												type: "object",
												properties: {},
											},
										},
									},
									{
										type: "function",
										function: {
											name: "submitSampleReport",
											description: "Submit the completed SAMPLE assessment to the system",
											parameters: {
												type: "object",
												properties: {
													patientStatus: {
														type: "string",
														enum: ["conscious", "unconscious", "partially_responsive"],
													},
													signsSymptoms: {
														type: "object",
														properties: {
															patientReported: { type: "string" },
															observedSigns: { type: "array", items: { type: "string" } },
														},
														required: ["patientReported", "observedSigns"],
													},
													allergies: {
														type: "object",
														properties: {
															known: { type: "array", items: { type: "string" } },
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
															conditions: { type: "array", items: { type: "string" } },
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
													transcript: { type: "string" },
													summary: { type: "string" },
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
							firstMessage: samplePrompt.firstMessage,
							// Pass metadata
							metadata: {
								incidentId: result.analysis.incidentId,
								emergencyType: highConfidence.type,
								confidence: highConfidence.confidence,
								protocol: "SAMPLE",
							},
						};

						// Start call with SAMPLE configuration
						vapiRef.current.start(config);
						addDebugLog("✅ SAMPLE assessment call started");
					} catch (vapiError: any) {
						console.error("[VAPI] Call preparation/start error:", vapiError);
						addDebugLog(`❌ VAPI error: ${vapiError.message || 'Unknown error'}`);
						currentIncidentIdRef.current = null;
						// Don't reset lock here - let call-end event handle it
					}
				}
			} catch (error: any) {
				console.error("Frame analysis error:", error);
				setLastAnalysis({
					emergencies: [],
					requiresImmediateAction: false,
					error: error.message || "Failed to analyze frame",
				});
			}
		};

		// Run analysis immediately, then on interval
		analyze();
		analysisIntervalRef.current = setInterval(analyze, samplingInterval);
	};

	return (
		<div className={`min-h-screen text-white p-8 transition-colors duration-500 ${
			isEmergencyActive
				? "bg-red-900/40 animate-pulse"
				: "bg-gray-900"
		}`}>
			{/* MASSIVE END CALL BUTTON - Fixed at top center */}
			{currentIncidentIdRef.current && (
				<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
					<button
						onClick={() => {
							if (vapiRef.current) {
								addDebugLog("🛑 Manually ending VAPI call...");
								vapiRef.current.stop();
								setIsEmergencyActive(false);
							}
						}}
						className="px-12 py-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-2xl font-black transition-all animate-pulse shadow-2xl border-4 border-white transform hover:scale-105"
					>
						<span>🛑 END CALL NOW 🛑</span>
					</button>
				</div>
			)}

			<div className="max-w-6xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
						<Video className="w-8 h-8" />
						Security Camera Feed Monitor
						{isEmergencyActive && (
							<span className="ml-4 text-red-500 font-bold animate-pulse">
								🚨 EMERGENCY DETECTED
							</span>
						)}
					</h1>
					<p className="text-gray-400">
						Monitor external security camera with AI-powered emergency detection
					</p>
				</div>

				{/* Video Feeds Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
					{/* CCTV External Feed */}
					<div className="bg-gray-800 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">📹 CCTV Feed</h2>
						<div className="relative bg-gray-700 rounded-lg overflow-hidden" style={{ height: '360px' }}>
							{isStreaming && currentFrame ? (
							<img
								src={currentFrame}
								alt="CCTV Feed"
								className="w-full h-full object-contain"
							/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<Video className="w-16 h-16 text-gray-500" />
								</div>
							)}
							{isStreaming && (
								<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded z-10 pointer-events-none">
									<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
									<span className="text-xs text-white">LIVE - CCTV</span>
								</div>
							)}
						</div>
						<p className="mt-2 text-xs text-gray-400">AI analysis running on this feed</p>
					</div>

					{/* Dog Cam (Webcam) */}
					<div className="bg-gray-800 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">🐕 Dog View</h2>
						<div className="relative bg-gray-700 rounded-lg overflow-hidden" style={{ height: '360px' }}>
							{dogCamTrack ? (
								<video
									ref={(el) => {
										if (el && dogCamTrack) {
											dogCamTrack.attach(el);
										}
									}}
									autoPlay
									playsInline
									muted
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<Video className="w-16 h-16 text-gray-500" />
								</div>
							)}
							{dogCamTrack && (
								<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded z-10 pointer-events-none">
									<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
									<span className="text-xs text-white">LIVE - DOG CAM</span>
								</div>
							)}
						</div>
						<p className="mt-2 text-xs text-gray-400">Webcam feed recorded to incident report</p>
					</div>
				</div>

				{/* Controls & Status */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Controls */}
					<div className="bg-gray-800 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">Controls</h2>
						<div className="space-y-3">
							{!isStreaming ? (
								<button
									onClick={startStreaming}
									className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
								>
									<Play className="w-5 h-5" />
									Connect to Feed
								</button>
							) : (
								<button
									onClick={stopStreaming}
									className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
								>
									<Square className="w-5 h-5" />
									Disconnect Feed
								</button>
							)}

							{/* Status */}
							{status && (
								<div
									className={`p-3 rounded-lg text-sm ${
										status.includes("Error")
											? "bg-red-900/30 text-red-400"
											: isStreaming
												? "bg-green-900/30 text-green-400"
												: "bg-gray-700 text-gray-300"
									}`}
								>
									<p>{status}</p>
								</div>
							)}
						</div>
					</div>

					{/* AI Analysis Status */}
					<div className="bg-gray-800 rounded-lg p-6">
						<h2 className="text-xl font-semibold mb-4">AI Analysis</h2>

						{isAnalyzing ? (
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-green-400">
									<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
									<span className="text-sm font-medium">Analysis Active</span>
								</div>

								{lastAnalysis ? (
									<div className="bg-gray-700 rounded-lg p-4 space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-400">
												Last Analysis
											</span>
											<span className="text-xs text-gray-500">
												{new Date().toLocaleTimeString()}
											</span>
										</div>

										{/* Show errors if present */}
										{lastAnalysis.error && (
											<div className="bg-red-900/30 border border-red-500 rounded p-3">
												<p className="text-red-400 text-sm font-semibold">
													Analysis Error
												</p>
												<p className="text-red-300 text-xs mt-1">
													{lastAnalysis.error}
												</p>
												{lastAnalysis.rawResponse && (
													<details className="mt-2">
														<summary className="text-xs text-red-400 cursor-pointer">
															View raw response
														</summary>
														<pre className="text-xs text-red-200 mt-1 overflow-x-auto">
															{lastAnalysis.rawResponse}
														</pre>
													</details>
												)}
											</div>
										)}

										{lastAnalysis.emergencies &&
										lastAnalysis.emergencies.length > 0 ? (
											<div className="space-y-2">
												{lastAnalysis.emergencies.map(
													(emergency: Emergency, idx: number) => (
														<div
															key={idx}
															className={`p-3 rounded border-l-4 ${
																emergency.type === "fire"
																	? "bg-orange-900/30 border-orange-500"
																	: emergency.type === "medical"
																		? "bg-red-900/30 border-red-500"
																		: emergency.type === "violence"
																			? "bg-purple-900/30 border-purple-500"
																			: "bg-blue-900/30 border-blue-500"
															}`}
														>
															<div className="flex items-center justify-between mb-1">
																<span className="font-semibold capitalize">
																	{emergency.type}
																</span>
																<span className="text-xs bg-white/10 px-2 py-0.5 rounded">
																	{(emergency.confidence * 100).toFixed(0)}%
																</span>
															</div>
															<p className="text-sm text-gray-300">
																{emergency.description}
															</p>
															<div className="mt-2 flex items-center gap-2 text-xs">
																<span
																	className={`px-2 py-0.5 rounded ${
																		emergency.severity === "critical"
																			? "bg-red-500/20 text-red-300"
																			: emergency.severity === "high"
																				? "bg-orange-500/20 text-orange-300"
																				: "bg-yellow-500/20 text-yellow-300"
																	}`}
																>
																	{emergency.severity}
																</span>
																{emergency.requiredUnits && (
																	<span className="text-gray-400">
																		→ {emergency.requiredUnits.join(", ")}
																	</span>
																)}
															</div>
														</div>
													),
												)}
											</div>
										) : (
											<div className="text-center py-4 text-gray-400">
												<AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
												<p className="text-sm">No emergencies detected</p>
											</div>
										)}

										{lastAnalysis.requiresImmediateAction && (
											<div className="bg-red-900/30 border border-red-500 rounded p-3">
												<p className="text-red-400 font-semibold text-sm">
													⚠️ IMMEDIATE ACTION REQUIRED
												</p>
												<p className="text-red-300 text-xs mt-1">
													Incident automatically created
												</p>
											</div>
										)}
									</div>
								) : (
									<div className="bg-gray-700 rounded-lg p-4 text-center text-gray-400">
										<Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
										<p className="text-sm">Analyzing frames...</p>
									</div>
								)}
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
								<p className="text-sm">Start streaming to enable AI analysis</p>
							</div>
						)}
					</div>

					{/* VAPI Call Control */}
					{currentIncidentIdRef.current && (
						<div className="bg-gray-800 rounded-lg p-6">
							<h3 className="text-lg font-semibold mb-3">SAMPLE Assessment Call</h3>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
										<span className="text-sm font-medium">Call Active</span>
									</div>
									<button
										onClick={() => {
											if (vapiRef.current) {
												addDebugLog("🛑 Manually ending VAPI call...");
												vapiRef.current.stop();
												// Reset emergency state
												setIsEmergencyActive(false);
											}
										}}
										className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
									>
										<span>End Call</span>
									</button>
								</div>
								<div className="bg-gray-900 rounded p-3 text-xs text-gray-400">
									<p>Incident ID: {currentIncidentIdRef.current}</p>
									{status && <p className="mt-1">Status: {status}</p>}
								</div>
							</div>
						</div>
					)}

					{/* Debug Log */}
					{isStreaming && debugLog.length > 0 && (
						<div className="bg-gray-800 rounded-lg p-6">
							<h3 className="text-lg font-semibold mb-3">Debug Log</h3>
							<div className="bg-gray-900 rounded p-3 font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
								{debugLog.map((log, idx) => (
									<div key={idx} className="text-gray-300">
										{log}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Info Section */}
				<div className="mt-8 bg-gray-800 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-3">How It Works</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
						<div>
							<p className="font-medium text-white mb-1">
								📹 External Security Camera
							</p>
							<p>
								Connects to external security camera feed for real-time monitoring
								and emergency detection analysis.
							</p>
						</div>
						<div>
							<p className="font-medium text-white mb-1">
								🤖 AI Emergency Detection
							</p>
							<p>
								Gemini 2.0 Flash analyzes frames every 5 seconds, detecting
								fires, medical emergencies, accidents, and hazards.
							</p>
						</div>
						<div>
							<p className="font-medium text-white mb-1">
								⚡ Auto-Incident Creation
							</p>
							<p>
								When AI detects an emergency with &gt;85% confidence, an
								incident is automatically created and AI voice call is initiated.
							</p>
						</div>
						<div>
							<p className="font-medium text-white mb-1">📞 Voice Assistant</p>
							<p>
								VAPI AI assistant calls to gather additional context and verify
								emergency details from on-site personnel.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
