"use client";

import { IncidentCard } from "./IncidentCard";
import { AlertCircle } from "lucide-react";

interface Incident {
	_id: string;
	_creationTime: number;
	incidentNumber: string;
	callReceived: number;
	incidentType: string;
	severity: number;
	priority: string;
	location: {
		address: string;
		city: string;
		state: string;
		zipCode: string;
		coordinates: {
			lat: number;
			lon: number;
		};
		locationNotes?: string;
	};
	description: string;
	status: string;
	victims: Array<{
		age?: number;
		gender?: string;
		condition: string;
		injuries: string[];
		medicalHistory?: string[];
	}>;
	assignedUnits: Array<{
		unitId: string;
		department: string;
		status: string;
		personnelCount: number;
		eta?: number;
	}>;
	transcription?: string;
	aiAnalysis?: string;
	[key: string]: any;
}

interface IncidentFeedProps {
	incidents: Incident[];
}

export function IncidentFeed({ incidents }: IncidentFeedProps) {
	if (incidents.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="rounded-full bg-muted p-3 mb-4">
					<AlertCircle className="w-8 h-8 text-muted-foreground" />
				</div>
				<h3 className="font-semibold text-lg mb-1">
					No incidents found
				</h3>
				<p className="text-sm text-muted-foreground max-w-sm">
					All clear in this category. New incidents will appear here automatically.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{incidents.map((incident) => (
				<IncidentCard key={incident._id} incident={incident} />
			))}
		</div>
	);
}
