"use client";

import { SalesAssistant } from "@/components/dashboard/sales-assistant";
import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";

export default function DashboardPage() {
	return (
		<>
			<RedirectToSignIn />
			<SignedIn>
				<div className="container mx-auto max-w-7xl px-4 py-6">
					<div className="mb-6">
						<h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
						<p className="text-muted-foreground">
							Track your performance and AI-powered insights
						</p>
					</div>
					<SalesAssistant />
				</div>
			</SignedIn>
		</>
	);
}
