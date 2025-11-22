"use client"

import {
  RedirectToSignIn,
  SignedIn,
  UpdateAvatarCard,
  UpdateNameCard,
  ChangeEmailCard
} from "@daveyplate/better-auth-ui"
import { motion } from "framer-motion"
import { AccountSidebar } from "./account-sidebar"

export function AccountSettingsPage() {

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
              <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your profile and account preferences.</p>
            </motion.div>

            <div className="flex flex-col gap-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <UpdateAvatarCard />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <UpdateNameCard />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <ChangeEmailCard />
              </motion.div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  )
}