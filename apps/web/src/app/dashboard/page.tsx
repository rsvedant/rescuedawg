"use client";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export default function DashboardPage() {
	return (
		<>
			<RedirectToSignIn />
			<AuthLoading>
				<div className="flex items-center justify-center min-h-screen">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
				</div>
			</AuthLoading>
			<Unauthenticated>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center">
						<h1 className="text-2xl font-bold mb-2">Access Denied</h1>
						<p className="text-gray-600">Please sign in to view the dashboard</p>
					</div>
				</div>
			</Unauthenticated>
			<Authenticated>
				<DashboardContent />
			</Authenticated>
		</>
	);
}
