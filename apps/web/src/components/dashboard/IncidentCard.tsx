"use client";

import { useState } from "react";
import { EmergencyScene } from "../3d/EmergencyScene";
import { formatDistanceToNow } from "date-fns";
import {
	Ambulance,
	Flame,
	Shield,
	AlertTriangle,
	MapPin,
	Clock,
	Users,
	ChevronDown,
	ChevronUp,
	Video,
	Activity,
	UserRound,
	TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Incident {
	_id: string;
	incidentNumber: string;
	callReceived: number;
	incidentType: string;
	severity: number;
	priority: string;
	location: {
		address: string;
		city: string;
		state: string;
		locationNotes?: string;
	};
	description: string;
	status: string;
	victims: Array<{
		age?: number;
		gender?: string;
		condition: string;
		injuries: string[];
	}>;
	assignedUnits: Array<{
		unitId: string;
		department: string;
		status: string;
		personnelCount: number;
	}>;
	transcription?: string;
	aiAnalysis?: string;

	// VAPI fields
	vapiCallId?: string;
	vapiTranscript?: string;
	vapiCollectedData?: {
		locationConfirmed: string;
		peopleAffected: number;
		currentStatus: string;
		immediateHazards: string[];
		additionalInfo?: string;
	};
	vapiCallStatus?: string;

	// Dog View fields
	dogViewFeedId?: string;
	dogViewRoomName?: string;
	dogViewStartTime?: number;
}

interface IncidentCardProps {
	incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
	const [expanded, setExpanded] = useState(false);

	const getSeverityColor = (severity: number) => {
		if (severity >= 5) return "bg-red-600";
		if (severity >= 4) return "bg-orange-600";
		if (severity >= 3) return "bg-yellow-600";
		return "bg-green-600";
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
			case "dispatched":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
			case "closed":
				return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
			default:
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "medical":
				return <Ambulance className="w-6 h-6 text-red-600" />;
			case "fire":
				return <Flame className="w-6 h-6 text-orange-600" />;
			case "police":
				return <Shield className="w-6 h-6 text-blue-600" />;
			case "hazmat":
				return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
			case "multi-agency":
				return <Activity className="w-6 h-6 text-purple-600" />;
			default:
				return <MapPin className="w-6 h-6 text-gray-600" />;
		}
	};

	return (
		<Card className="overflow-hidden transition-all hover:shadow-lg cursor-pointer" onClick={() => setExpanded(!expanded)}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
								{getTypeIcon(incident.incidentType)}
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									{incident.incidentNumber}
								</h3>
								<div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
									<Clock className="w-3 h-3" />
									{formatDistanceToNow(incident.callReceived, {
										addSuffix: true,
									})}
								</div>
							</div>
						</div>

						<p className="text-gray-700 dark:text-gray-300 mb-3">
							{incident.description}
						</p>

						<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
							<MapPin className="w-4 h-4" />
							<span>{incident.location.address}</span>
							<span className="text-gray-400">•</span>
							<span>
								{incident.location.city}, {incident.location.state}
							</span>
						</div>
					</div>

					<div className="flex flex-col items-end gap-2 ml-4">
						<div
							className={cn(
								"w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md",
								getSeverityColor(incident.severity)
							)}
						>
							{incident.severity}
						</div>
						<Badge
							variant="secondary"
							className={cn("font-semibold", getStatusColor(incident.status))}
						>
							{incident.status.toUpperCase()}
						</Badge>
					</div>
				</div>

				{/* Departments & Victims */}
				<div className="mt-4 flex items-center gap-4 flex-wrap">
					<div className="flex gap-2">
						{Array.from(
							new Set(incident.assignedUnits.map((u) => u.department)),
						).map((dept) => (
							<Badge
								key={dept}
								variant="outline"
								className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 gap-1"
							>
								{dept === "EMS" && <Ambulance className="w-3 h-3" />}
								{dept === "Fire" && <Flame className="w-3 h-3" />}
								{dept === "Police" && <Shield className="w-3 h-3" />}
								{dept}
							</Badge>
						))}
					</div>

					{incident.victims.length > 0 && (
						<div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
							<Users className="w-4 h-4" />
							<span>
								{incident.victims.length} victim
								{incident.victims.length !== 1 ? "s" : ""}
							</span>
						</div>
					)}
				</div>

				{/* Expand indicator */}
				<div className="mt-4 flex items-center justify-center text-muted-foreground">
					{expanded ? (
						<ChevronUp className="w-4 h-4" />
					) : (
						<ChevronDown className="w-4 h-4" />
					)}
				</div>
			</CardHeader>

			{/* Expanded Content */}
			{expanded && (
				<CardContent className="border-t bg-muted/30 space-y-6 pt-6">
					{/* Dog View Video Feed */}
					{incident.dogViewFeedId && (
						<div>
							<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
								<Video className="w-4 h-4" />
								🐕 Dog View (Body Camera)
							</h4>
							<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
								{/* Video Placeholder */}
								<div className="relative bg-gradient-to-br from-gray-700 to-gray-900 aspect-video flex items-center justify-center">
									<div className="text-center p-6">
										<Video className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-80" />
										<p className="text-white font-medium mb-1">Live Feed Available</p>
										<p className="text-sm text-gray-300 mb-3">Body camera footage recorded during response</p>
										<div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500 text-blue-300 px-3 py-1.5 rounded-lg text-xs">
											<div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
											<span className="font-medium">RECORDED</span>
										</div>
									</div>
									{/* Corner badge */}
									<div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
										<span className="text-xs text-white font-mono">{incident.dogViewFeedId.substring(0, 16)}...</span>
									</div>
								</div>

								{/* Metadata */}
								<div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
									<div className="grid grid-cols-2 gap-3 text-sm">
										<div>
											<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Feed ID</p>
											<p className="text-gray-900 dark:text-white font-mono text-xs truncate" title={incident.dogViewFeedId}>
												{incident.dogViewFeedId}
											</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">LiveKit Room</p>
											<p className="text-gray-900 dark:text-white font-mono text-xs">
												{incident.dogViewRoomName || "emergency-feeds"}
											</p>
										</div>
									</div>

									{incident.dogViewStartTime && (
										<div>
											<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Recording Started</p>
											<p className="text-gray-900 dark:text-white text-sm">
												{new Date(incident.dogViewStartTime).toLocaleString()}
											</p>
										</div>
									)}

									<div className="pt-2 border-t border-gray-200 dark:border-gray-700">
										<p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
											<Activity className="w-3 h-3" />
											Video stream from field responder's body camera
										</p>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* VAPI Call Status */}
					{incident.vapiCallStatus && (
						<div>
							<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
								<Activity className="w-4 h-4" />
								Voice AI Interview Status
							</h4>
							<div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
								<div className="flex items-center gap-2">
									<Badge
										variant="secondary"
										className={cn(
											"font-semibold",
											incident.vapiCallStatus === "completed"
												? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
												: incident.vapiCallStatus === "collecting"
													? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
													: incident.vapiCallStatus === "pending"
														? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
														: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
										)}
									>
										{incident.vapiCallStatus.toUpperCase()}
									</Badge>
									{incident.vapiCallId && (
										<span className="text-xs text-gray-500">Call ID: {incident.vapiCallId}</span>
									)}
								</div>
							</div>
						</div>
					)}

					{/* VAPI Collected Data */}
					{incident.vapiCollectedData && (
						<div>
							<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
								<UserRound className="w-4 h-4" />
								Bystander Interview Data
							</h4>
							<div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location Confirmed</p>
										<p className="text-sm text-gray-900 dark:text-white mt-1">
											{incident.vapiCollectedData.locationConfirmed}
										</p>
									</div>
									<div>
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">People Affected</p>
										<p className="text-sm text-gray-900 dark:text-white mt-1">
											{incident.vapiCollectedData.peopleAffected}
										</p>
									</div>
								</div>
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Current Status</p>
									<p className="text-sm text-gray-900 dark:text-white mt-1">
										{incident.vapiCollectedData.currentStatus}
									</p>
								</div>
								{incident.vapiCollectedData.immediateHazards.length > 0 && (
									<div>
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Immediate Hazards</p>
										<div className="flex flex-wrap gap-2">
											{incident.vapiCollectedData.immediateHazards.map((hazard, idx) => (
												<Badge key={idx} variant="destructive" className="text-xs">
													⚠️ {hazard}
												</Badge>
											))}
										</div>
									</div>
								)}
								{incident.vapiCollectedData.additionalInfo && (
									<div>
										<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Additional Information</p>
										<p className="text-sm text-gray-900 dark:text-white mt-1">
											{incident.vapiCollectedData.additionalInfo}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* VAPI Transcript */}
					{incident.vapiTranscript && (
						<div>
							<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
								<Activity className="w-4 h-4" />
								Bystander Interview Transcript
							</h4>
							<div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
								{incident.vapiTranscript}
							</div>
						</div>
					)}

					{/* AI Synthesis */}
					{incident.aiAnalysis && (
						<div>
							<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
								<Activity className="w-4 h-4" />
								AI Synthesized Analysis
							</h4>
							<div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
								<p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
									{incident.aiAnalysis}
								</p>
							</div>
						</div>
					)}

					{/* 3D Scene */}
					<div>
						<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
							<TrendingUp className="w-5 h-5" />
							3D Scene Reconstruction
						</h4>
						<EmergencyScene sceneType="indoor" />
					</div>

					{/* Transcription */}
					{incident.transcription && (
						<div>
							<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
								<Activity className="w-5 h-5" />
								911 Call Transcription
							</h4>
							<div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap border border-gray-200 dark:border-gray-700">
								{incident.transcription}
							</div>
						</div>
					)}

					{/* Victims */}
					{incident.victims.length > 0 && (
						<div>
							<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
								<UserRound className="w-5 h-5" />
								Victim Information
							</h4>
							<div className="space-y-3">
								{incident.victims.map((victim, idx) => (
									<div
										key={idx}
										className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
									>
										<div className="flex items-center gap-2 mb-2">
											<span className="font-medium">
												{victim.gender && victim.age
													? `${victim.age}y/o ${victim.gender}`
													: "Unknown"}
											</span>
											<span
												className={`px-2 py-1 rounded text-xs font-semibold ${
													victim.condition === "critical"
														? "bg-red-100 text-red-800"
														: victim.condition === "stable"
															? "bg-green-100 text-green-800"
															: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{victim.condition}
											</span>
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">
											<span className="font-medium">Injuries: </span>
											{victim.injuries.join(", ")}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Assigned Units */}
					<div>
						<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
							<Activity className="w-5 h-5" />
							Response Units
						</h4>
						<div className="space-y-2">
							{incident.assignedUnits.map((unit) => (
								<div
									key={unit.unitId}
									className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between border border-gray-200 dark:border-gray-700"
								>
									<div className="flex items-center gap-3">
										{unit.department === "EMS" && (
											<Ambulance className="w-5 h-5 text-red-600" />
										)}
										{unit.department === "Fire" && (
											<Flame className="w-5 h-5 text-orange-600" />
										)}
										{unit.department === "Police" && (
											<Shield className="w-5 h-5 text-blue-600" />
										)}
										<div>
											<div className="font-medium">{unit.unitId}</div>
											<div className="text-sm text-gray-600 dark:text-gray-400">
												{unit.department} • {unit.personnelCount} personnel
											</div>
										</div>
									</div>
									<span
										className={`px-3 py-1 rounded-full text-xs font-semibold ${
											unit.status === "on-scene"
												? "bg-green-100 text-green-800"
												: unit.status === "en-route"
													? "bg-yellow-100 text-yellow-800"
													: "bg-gray-100 text-gray-800"
										}`}
									>
										{unit.status}
									</span>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			)}
		</Card>
	);
}
