"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { AuthProvider } from "./auth-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<AuthProvider>
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				disableTransitionOnChange
			>
				<ConvexBetterAuthProvider client={convex} authClient={authClient}>
					{children}
				</ConvexBetterAuthProvider>
				<Toaster richColors />
			</ThemeProvider>
		</AuthProvider>
	);
}