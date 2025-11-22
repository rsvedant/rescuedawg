"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
import Vapi from "@vapi-ai/web";

export default function VapiTestPage() {
	const vapiRef = useRef<Vapi | null>(null);
	const [isCallActive, setIsCallActive] = useState(false);
	const [status, setStatus] = useState<string>("Ready to test");
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
		console.log(`[VAPI TEST] ${message}`);
	};

	useEffect(() => {
		// Initialize VAPI on mount
		if (typeof window === "undefined") return;
		if (vapiRef.current) return;

		try {
			const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
			if (!publicKey) {
				addLog("❌ Public key not configured");
				setStatus("Error: No public key");
				return;
			}

			vapiRef.current = new Vapi(publicKey);
			addLog("✅ VAPI SDK initialized");
			setStatus("Ready - SDK initialized");

			// Setup event listeners
			vapiRef.current.on("call-start", () => {
				addLog("✅ Call started");
				setIsCallActive(true);
				setStatus("Call active");
			});

			vapiRef.current.on("call-end", () => {
				addLog("📴 Call ended");
				setIsCallActive(false);
				setStatus("Call ended");
			});

			vapiRef.current.on("speech-start", () => {
				addLog("🗣️ User started speaking");
			});

			vapiRef.current.on("speech-end", () => {
				addLog("🤫 User stopped speaking");
			});

			vapiRef.current.on("message", (message: any) => {
				if (message.type === "transcript" && message.transcript) {
					addLog(`💬 ${message.role}: ${message.transcript}`);
				} else if (message.type === "function-call") {
					addLog(`🔧 Function call: ${message.functionCall?.name}`);
				}
			});

			vapiRef.current.on("error", (error: any) => {
				const errorMsg =
					error?.message || error?.error || JSON.stringify(error) || "Unknown error";
				addLog(`❌ Error: ${errorMsg}`);
				setStatus(`Error: ${errorMsg}`);
			});

			addLog("✅ Event listeners registered");
		} catch (error: any) {
			addLog(`❌ Initialization failed: ${error.message}`);
			setStatus("Initialization failed");
		}

		return () => {
			if (vapiRef.current && isCallActive) {
				try {
					vapiRef.current.stop();
					addLog("🧹 Cleanup complete");
				} catch (e) {
					console.warn("Cleanup error:", e);
				}
			}
		};
	}, []);

	const startTestCall = async () => {
		if (!vapiRef.current) {
			addLog("❌ SDK not initialized");
			return;
		}

		try {
			setStatus("Starting test call...");
			addLog("🚀 Starting test call with transient assistant");

			const config: any = {
				model: {
					provider: "openai",
					model: "gpt-4o",
					messages: [
						{
							role: "system",
							content:
								"You are a friendly test assistant. Greet the user and ask them how their day is going. Keep the conversation natural and brief.",
						},
					],
				},
				transcriber: {
					provider: "deepgram",
					model: "nova-2",
					language: "en",
				},
				firstMessage: "Hi there! This is a test call from VAPI. How are you doing today?",
				name: `Test-${Date.now()}`,
			};

			addLog("📤 Sending start command with config:");
			addLog(JSON.stringify(config, null, 2));

			await vapiRef.current.start(config);
			addLog("✅ Start command sent");
		} catch (error: any) {
			const errorMsg = error?.message || error?.toString() || "Unknown error";
			addLog(`❌ Failed to start: ${errorMsg}`);
			setStatus(`Failed: ${errorMsg}`);
		}
	};

	const endCall = () => {
		if (!vapiRef.current) return;

		try {
			addLog("🛑 Stopping call...");
			vapiRef.current.stop();
			setStatus("Stopping...");
		} catch (error: any) {
			addLog(`❌ Stop error: ${error.message}`);
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 text-white p-8">
			<div className="max-w-4xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2">VAPI Test Console</h1>
					<p className="text-gray-400">
						Test VAPI integration with a simple transient assistant
					</p>
				</div>

				{/* Status */}
				<div className="bg-gray-800 rounded-lg p-6 mb-6">
					<h2 className="text-xl font-semibold mb-4">Status</h2>
					<div
						className={`p-4 rounded-lg ${
							status.includes("Error") || status.includes("Failed")
								? "bg-red-900/30 text-red-400"
								: isCallActive
									? "bg-green-900/30 text-green-400"
									: "bg-blue-900/30 text-blue-400"
						}`}
					>
						{status}
					</div>
				</div>

				{/* Controls */}
				<div className="bg-gray-800 rounded-lg p-6 mb-6">
					<h2 className="text-xl font-semibold mb-4">Controls</h2>
					<div className="flex gap-4">
						{!isCallActive ? (
							<button
								onClick={startTestCall}
								className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
							>
								<Phone className="w-5 h-5" />
								Start Test Call
							</button>
						) : (
							<button
								onClick={endCall}
								className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
							>
								<PhoneOff className="w-5 h-5" />
								End Call
							</button>
						)}
					</div>
				</div>

				{/* Event Logs */}
				<div className="bg-gray-800 rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">Event Logs</h2>
					<div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
						{logs.length === 0 ? (
							<p className="text-gray-500">No events yet...</p>
						) : (
							<div className="space-y-1">
								{logs.map((log, idx) => (
									<div key={idx} className="text-gray-300">
										{log}
									</div>
								))}
							</div>
						)}
					</div>
					{logs.length > 0 && (
						<button
							onClick={() => setLogs([])}
							className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
						>
							Clear Logs
						</button>
					)}
				</div>

				{/* Instructions */}
				<div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
					<h3 className="text-lg font-semibold mb-2">How to Test</h3>
					<ol className="list-decimal list-inside space-y-2 text-gray-300">
						<li>Make sure your microphone is connected and working</li>
						<li>Click "Start Test Call" to initiate a VAPI call</li>
						<li>
							The assistant will greet you - speak naturally to test the conversation
						</li>
						<li>Watch the logs below to see all events and messages</li>
						<li>Click "End Call" when you're done testing</li>
					</ol>
				</div>
			</div>
		</div>
	);
}
