"use client"

import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { type ReactNode } from "react"

import { authClient } from "@/lib/auth-client"

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter()

    // Create navigation handlers that properly handle the type difference
    // between Better Auth UI (expects string) and Next.js App Router (expects typed routes)
    const handleNavigate = React.useCallback((path: string) => {
        // Use dynamic import to handle the route
        void router.push(path as Parameters<typeof router.push>[0])
    }, [router])

    const handleReplace = React.useCallback((path: string) => {
        // Use dynamic import to handle the route
        void router.replace(path as Parameters<typeof router.replace>[0])
    }, [router])

    return (
        <AuthUIProvider
            authClient={authClient}
            navigate={handleNavigate}
            replace={handleReplace}
            onSessionChange={() => {
                // Clear router cache (protected routes)
                router.refresh()
            }}
            Link={Link as any}
            social={{
                providers: ["google"]
            }}
            passkey
            twoFactor={["otp", "totp"]}
            emailVerification
            magicLink
        >
            {children}
        </AuthUIProvider>
    )
}