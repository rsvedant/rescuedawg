"use client";

import { useQuery } from "convex/react";
import { api } from "@rescuedawg/backend/convex/_generated/api";
import { IncidentFeed } from "./IncidentFeed";
import { VideoFeedSidebar } from "./VideoFeedSidebar";
import { useState, useMemo } from "react";
import {
	Activity,
	Clock,
	CheckCircle2,
	AlertCircle,
	Flame,
	TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TabType = "active" | "ongoing" | "closed";

export function DashboardContent() {
	const [activeTab, setActiveTab] = useState<TabType>("active");

	// Single query - fetch ALL incidents once
	const allIncidents = useQuery(api.incidents.getAll, { limit: 100 });

	// Client-side filtering - INSTANT, no re-query
	const filteredIncidents = useMemo(() => {
		if (!allIncidents) return [];

		switch (activeTab) {
			case "active":
				return allIncidents.filter((i: any) => i.status === "active");
			case "ongoing":
				return allIncidents.filter(
					(i: any) => i.status === "dispatched" || i.status === "received",
				);
			case "closed":
				return allIncidents.filter((i: any) => i.status === "closed");
			default:
				return allIncidents;
		}
	}, [allIncidents, activeTab]);

	// Stats calculations
	const stats = useMemo(() => {
		if (!allIncidents) return { active: 0, ongoing: 0, critical: 0, total: 0 };

		return {
			active: allIncidents.filter((i: any) => i.status === "active").length,
			ongoing: allIncidents.filter(
				(i: any) => i.status === "dispatched" || i.status === "received",
			).length,
			critical: allIncidents.filter((i: any) => i.priority === "CRITICAL").length,
			total: allIncidents.length,
		};
	}, [allIncidents]);

	// Initial loading state
	if (allIncidents === undefined) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-background overflow-hidden">
			{/* Compact Header with Stats */}
			<header className="border-b bg-card/50 backdrop-blur shrink-0">
				<div className="px-6 py-3">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<Activity className="w-5 h-5 text-primary" />
							<h1 className="text-xl font-semibold">Emergency Response</h1>
						</div>

						{/* Compact Stats */}
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border">
								<Activity className="h-3.5 w-3.5 text-muted-foreground" />
								<span className="text-sm font-semibold">{stats.total}</span>
								<span className="text-xs text-muted-foreground">Total</span>
							</div>
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
								<AlertCircle className="h-3.5 w-3.5 text-destructive" />
								<span className="text-sm font-semibold text-destructive">{stats.active}</span>
								<span className="text-xs text-muted-foreground">Active</span>
							</div>
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
								<Clock className="h-3.5 w-3.5 text-yellow-600" />
								<span className="text-sm font-semibold text-yellow-600">{stats.ongoing}</span>
								<span className="text-xs text-muted-foreground">Ongoing</span>
							</div>
							<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20">
								<Flame className="h-3.5 w-3.5 text-orange-600" />
								<span className="text-sm font-semibold text-orange-600">{stats.critical}</span>
								<span className="text-xs text-muted-foreground">Critical</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<div className="flex-1 overflow-y-auto">
				<div className="p-6">
					{/* Video Feed Grid - Center Focus */}
					<div className="mb-6">
						<VideoFeedSidebar />
					</div>

					{/* Reports Section - Below Videos */}
					<div className="border-t pt-6">
						<div className="mb-4">
							<h2 className="text-lg font-semibold flex items-center gap-2">
								<TrendingUp className="w-5 h-5" />
								Incident Reports
							</h2>

							{/* Tabs */}
							<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="mt-3">
								<TabsList className="grid w-full grid-cols-3 max-w-md">
									<TabsTrigger value="active" className="text-xs">
										Active
										{stats.active > 0 && (
											<Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
												{stats.active}
											</Badge>
										)}
									</TabsTrigger>
									<TabsTrigger value="ongoing" className="text-xs">
										Ongoing
										{stats.ongoing > 0 && (
											<Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
												{stats.ongoing}
											</Badge>
										)}
									</TabsTrigger>
									<TabsTrigger value="closed" className="text-xs">
										Closed
									</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>

						{/* Incident Feed - Limited Height to Show a Few */}
						<div className="max-h-[400px] overflow-y-auto">
							<IncidentFeed incidents={filteredIncidents} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
