"use client"

import { motion } from "framer-motion"
import { RedirectToSignIn, SignedIn, ProvidersCard, SessionsCard, DeleteAccountCard, ChangePasswordCard, TwoFactorCard, PasskeysCard } from "@daveyplate/better-auth-ui"
import { AccountSidebar } from "./account-sidebar"

export function SecuritySettingsPage() {
  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <AccountSidebar />
        <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">

          <div className="mx-auto max-w-3xl px-6 pt-20 lg:pt-6 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage password, sessions, providers & account protection.</p>
            </motion.div>
            <div className="flex flex-col gap-6">
              {[<ChangePasswordCard key="pw" />, <ProvidersCard key="prov" />, <TwoFactorCard key="2fa" />, <PasskeysCard key="passkeys" />, <SessionsCard key="sessions" />, <DeleteAccountCard key="delete" />].map((node, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  {node}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  )
}