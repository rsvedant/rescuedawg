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
		<div className="flex h-screen bg-background">
			{/* Left Sidebar - Video Feeds */}
			<VideoFeedSidebar />

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<header className="border-b bg-card/50 backdrop-blur supports-backdrop-filter:bg-card/50">
					<div className="px-6 py-5">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
									<Activity className="w-5 h-5 text-primary" />
									Emergency Response
								</h1>
								<p className="text-sm text-muted-foreground">
									Real-time incident monitoring and coordination
								</p>
							</div>
						</div>
					</div>
				</header>

				{/* Stats Grid */}
				<div className="px-6 py-6 space-y-6">
					<div className="grid gap-4 md:grid-cols-4">
						<Card className="transition-all hover:shadow-md">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Incidents
								</CardTitle>
								<Activity className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{stats.total}</div>
								<p className="text-xs text-muted-foreground mt-1">
									All time incidents
								</p>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-md border-destructive/20">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Active
								</CardTitle>
								<AlertCircle className="h-4 w-4 text-destructive" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-destructive">{stats.active}</div>
								<p className="text-xs text-muted-foreground mt-1">
									Requires immediate attention
								</p>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-md border-yellow-500/20">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									In Progress
								</CardTitle>
								<Clock className="h-4 w-4 text-yellow-600" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-yellow-600">{stats.ongoing}</div>
								<p className="text-xs text-muted-foreground mt-1">
									Being handled
								</p>
							</CardContent>
						</Card>

						<Card className="transition-all hover:shadow-md border-orange-500/20">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Critical
								</CardTitle>
								<Flame className="h-4 w-4 text-orange-600" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-orange-600">{stats.critical}</div>
								<p className="text-xs text-muted-foreground mt-1">
									High priority cases
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Tabs */}
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
						<TabsList className="grid w-full max-w-md grid-cols-3">
							<TabsTrigger value="active" className="gap-2">
								<AlertCircle className="h-4 w-4" />
								Active
								{stats.active > 0 && (
									<Badge variant="destructive" className="ml-1 h-5 px-1.5">
										{stats.active}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="ongoing" className="gap-2">
								<Clock className="h-4 w-4" />
								Ongoing
								{stats.ongoing > 0 && (
									<Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
										{stats.ongoing}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="closed" className="gap-2">
								<CheckCircle2 className="h-4 w-4" />
								Closed
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Incident Feed - Scrollable */}
				<div className="flex-1 overflow-y-auto px-6 pb-6">
					<IncidentFeed incidents={filteredIncidents} />
				</div>
			</div>
		</div>
	);
}
