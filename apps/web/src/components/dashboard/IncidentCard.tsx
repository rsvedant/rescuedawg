"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
		if (severity >= 5) return "bg-red-500";
		if (severity >= 4) return "bg-orange-500";
		if (severity >= 3) return "bg-yellow-500";
		return "bg-green-500";
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-red-500/10 text-red-600 border-red-500/20";
			case "dispatched":
			case "received":
				return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
			case "closed":
				return "bg-gray-500/10 text-gray-600 border-gray-500/20";
			default:
				return "bg-blue-500/10 text-blue-600 border-blue-500/20";
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "medical":
				return <Ambulance className="w-5 h-5" />;
			case "fire":
				return <Flame className="w-5 h-5" />;
			case "police":
				return <Shield className="w-5 h-5" />;
			default:
				return <AlertTriangle className="w-5 h-5" />;
		}
	};

	return (
		<Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpanded(!expanded)}>
			<div className="flex items-start justify-between gap-3 mb-2">
				<div className="flex items-center gap-2.5">
					<div className={cn("p-2 rounded", getSeverityColor(incident.severity))}>
						{getTypeIcon(incident.incidentType)}
					</div>
					<div>
						<p className="font-semibold text-sm mb-0.5">{incident.incidentNumber}</p>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Clock className="w-3 h-3" />
							{formatDistanceToNow(incident.callReceived, { addSuffix: true })}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge className={cn("text-xs font-semibold border", getStatusColor(incident.status))}>
						{incident.status.toUpperCase()}
					</Badge>
					{expanded ? (
						<ChevronUp className="w-4 h-4 text-muted-foreground" />
					) : (
						<ChevronDown className="w-4 h-4 text-muted-foreground" />
					)}
				</div>
			</div>

			<p className="text-sm text-muted-foreground mb-2 line-clamp-2">
				{incident.description}
			</p>

			<div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
				<MapPin className="w-3 h-3 mt-0.5 shrink-0" />
				<span className="line-clamp-1">
					{incident.location.address}, {incident.location.city}
				</span>
			</div>

			<div className="flex items-center justify-between pt-3 border-t">
				<div className="flex gap-2">
					{Array.from(new Set(incident.assignedUnits.map((u) => u.department))).map((dept) => (
						<Badge key={dept} variant="outline" className="text-xs gap-1">
							{dept === "EMS" && <Ambulance className="w-3 h-3" />}
							{dept === "Fire" && <Flame className="w-3 h-3" />}
							{dept === "Police" && <Shield className="w-3 h-3" />}
							{dept}
						</Badge>
					))}
				</div>

				{incident.victims.length > 0 && (
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<Users className="w-3 h-3" />
						<span>{incident.victims.length}</span>
					</div>
				)}
			</div>

			{/* Expanded Details */}
			{expanded && (
				<div className="mt-4 pt-4 border-t space-y-4">
					{/* Full Location */}
					<div>
						<p className="text-xs font-semibold text-muted-foreground mb-1">Location</p>
						<p className="text-sm">
							{incident.location.address}, {incident.location.city}, {incident.location.state}
						</p>
						{incident.location.locationNotes && (
							<p className="text-xs text-muted-foreground mt-1">{incident.location.locationNotes}</p>
						)}
					</div>

					{/* Dog View Video Feed */}
					{incident.dogViewFeedId && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<Video className="w-3 h-3" />
								🐕 Dog View (Body Camera)
							</p>
							<div className="bg-muted/50 rounded p-3 space-y-2">
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div>
										<p className="text-muted-foreground">Feed ID</p>
										<p className="font-mono truncate">{incident.dogViewFeedId}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Room</p>
										<p className="font-mono">{incident.dogViewRoomName || "emergency-feeds"}</p>
									</div>
								</div>
								{incident.dogViewStartTime && (
									<div className="text-xs">
										<p className="text-muted-foreground">Recording Started</p>
										<p>{new Date(incident.dogViewStartTime).toLocaleString()}</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* VAPI Call Status */}
					{incident.vapiCallStatus && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<Activity className="w-3 h-3" />
								Voice AI Interview Status
							</p>
							<div className="flex items-center gap-2">
								<Badge className={cn(
									"text-xs font-semibold",
									incident.vapiCallStatus === "completed" ? "bg-green-500/10 text-green-600 border-green-500/20" :
									incident.vapiCallStatus === "collecting" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
									incident.vapiCallStatus === "pending" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
									"bg-red-500/10 text-red-600 border-red-500/20"
								)}>
									{incident.vapiCallStatus.toUpperCase()}
								</Badge>
								{incident.vapiCallId && (
									<span className="text-xs text-muted-foreground">Call ID: {incident.vapiCallId}</span>
								)}
							</div>
						</div>
					)}

					{/* VAPI Collected Data */}
					{incident.vapiCollectedData && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<UserRound className="w-3 h-3" />
								Bystander Interview Data
							</p>
							<div className="bg-muted/50 rounded p-3 space-y-2">
								<div className="grid grid-cols-2 gap-3 text-xs">
									<div>
										<p className="text-muted-foreground">Location Confirmed</p>
										<p className="text-sm">{incident.vapiCollectedData.locationConfirmed}</p>
									</div>
									<div>
										<p className="text-muted-foreground">People Affected</p>
										<p className="text-sm">{incident.vapiCollectedData.peopleAffected}</p>
									</div>
								</div>
								<div className="text-xs">
									<p className="text-muted-foreground">Current Status</p>
									<p className="text-sm">{incident.vapiCollectedData.currentStatus}</p>
								</div>
								{incident.vapiCollectedData.immediateHazards.length > 0 && (
									<div className="text-xs">
										<p className="text-muted-foreground mb-1">Immediate Hazards</p>
										<div className="flex flex-wrap gap-1">
											{incident.vapiCollectedData.immediateHazards.map((hazard, idx) => (
												<Badge key={idx} variant="destructive" className="text-xs">
													⚠️ {hazard}
												</Badge>
											))}
										</div>
									</div>
								)}
								{incident.vapiCollectedData.additionalInfo && (
									<div className="text-xs">
										<p className="text-muted-foreground">Additional Information</p>
										<p className="text-sm">{incident.vapiCollectedData.additionalInfo}</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* VAPI Transcript */}
					{incident.vapiTranscript && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<Activity className="w-3 h-3" />
								Bystander Interview Transcript
							</p>
							<div className="bg-muted/50 rounded p-3 font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
								{incident.vapiTranscript}
							</div>
						</div>
					)}

					{/* AI Synthesis */}
					{incident.aiAnalysis && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<Activity className="w-3 h-3" />
								AI Synthesized Analysis
							</p>
							<div className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-950/50 dark:to-blue-950/50 rounded p-3 border border-purple-200 dark:border-purple-800/50">
								<p className="text-sm whitespace-pre-wrap">{incident.aiAnalysis}</p>
							</div>
						</div>
					)}

					{/* 911 Call Transcription */}
					{incident.transcription && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<Activity className="w-3 h-3" />
								911 Call Transcription
							</p>
							<div className="bg-muted/50 rounded p-3 font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
								{incident.transcription}
							</div>
						</div>
					)}

					{/* Victims */}
					{incident.victims.length > 0 && (
						<div>
							<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
								<UserRound className="w-3 h-3" />
								Victim Information
							</p>
							<div className="space-y-2">
								{incident.victims.map((victim, idx) => (
									<div key={idx} className="bg-muted/50 rounded p-3">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-medium">
												{victim.age && victim.gender ? `${victim.age}y/o ${victim.gender}` : "Unknown"}
											</span>
											<Badge variant="outline" className={cn(
												"text-xs",
												victim.condition === "critical" ? "border-red-500 text-red-600" :
												victim.condition === "stable" ? "border-green-500 text-green-600" :
												"border-yellow-500 text-yellow-600"
											)}>
												{victim.condition}
											</Badge>
										</div>
										<div className="text-xs text-muted-foreground">
											<span className="font-medium">Injuries: </span>
											{victim.injuries.join(", ")}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Response Units */}
					<div>
						<p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
							<Activity className="w-3 h-3" />
							Response Units
						</p>
						<div className="space-y-2">
							{incident.assignedUnits.map((unit) => (
								<div key={unit.unitId} className="flex items-center justify-between bg-muted/50 rounded p-3">
									<div className="flex items-center gap-2">
										{unit.department === "EMS" && <Ambulance className="w-4 h-4 text-red-600" />}
										{unit.department === "Fire" && <Flame className="w-4 h-4 text-orange-600" />}
										{unit.department === "Police" && <Shield className="w-4 h-4 text-blue-600" />}
										<div>
											<p className="font-medium text-sm">{unit.unitId}</p>
											<p className="text-xs text-muted-foreground">{unit.department} • {unit.personnelCount} personnel</p>
										</div>
									</div>
									<Badge variant="outline" className={cn(
										"text-xs",
										unit.status === "on-scene" ? "border-green-500 text-green-600" :
										unit.status === "en-route" ? "border-yellow-500 text-yellow-600" :
										"border-gray-500 text-gray-600"
									)}>
										{unit.status}
									</Badge>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</Card>
	);
}
