import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query, internalQuery } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import { passkey } from "better-auth/plugins/passkey"
import { twoFactor, magicLink } from "better-auth/plugins";

const siteUrl = process.env.NGROK_WEBHOOK_URL ? process.env.NGROK_WEBHOOK_URL : process.env.SITE_URL;

export const authComponent = createClient<DataModel>(components.betterAuth);

type ClientContextPayload = {
  ip?: string;
  ipChain?: string;
  userAgent?: string;
  city?: string;
  region?: string;
  country?: string;
};

function extractClientContext(request?: Request | null): ClientContextPayload | undefined {
  if (!request) return undefined;
  const headers = request.headers;
  if (!headers) return undefined;
  const get = (name: string) => headers.get(name)?.trim() || undefined;
  const ipChain =
    get("x-forwarded-for") ||
    get("cf-connecting-ip") ||
    get("x-real-ip") ||
    get("x-client-ip");
  const ip = ipChain?.split(",")[0]?.trim();
  const context: ClientContextPayload = {
    ip,
    ipChain,
    userAgent: get("user-agent"),
    city: get("x-vercel-ip-city") || get("cf-ipcity"),
    region: get("x-vercel-ip-region") || get("cf-region"),
    country: get("x-vercel-ip-country") || get("cf-ipcountry"),
  };
  const hasValue = Boolean(
    context.ip ||
      context.ipChain ||
      context.userAgent ||
      context.city ||
      context.region ||
      context.country,
  );
  return hasValue ? context : undefined;
}

function createAuth(
	ctx: GenericCtx<DataModel>,
	{ optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
	  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    // Allow both local dev and tunnel/external origins.
    // Resolves: Invalid origin errors when frontend runs on localhost but baseURL / email links use ngrok.
    trustedOrigins: [
      siteUrl
    ].filter(Boolean) as string[],
    user: {
        deleteUser: { 
            enabled: true
        } 
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string, 
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
      }
    },
    baseURL: process.env.SITE_URL,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url, token }, request) => {
        try {
          const clientContext = extractClientContext(request);
          const res = await fetch(`${siteUrl}/api/auth/send-reset-password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
            },
            body: JSON.stringify({
              user: { email: user.email, name: user.name },
              url,
              token,
              clientContext,
            }),
          });
          if (!res.ok) {
            console.error("[sendResetPassword] Proxy route failed", await res.text());
          }
        } catch (e) {
          console.error("[sendResetPassword] Proxy request error", e);
        }
      },
      onPasswordReset: async ({ user }, request) => {
        console.log("[onPasswordReset] Password reset for", user?.email);
      },
    },
    emailVerification: {
      sendVerificationEmail: async (data, request) => {
        const { user, url, token } = data;
        try {
          const clientContext = extractClientContext(request);
          // Call Next.js API route to send the email using the original template.
          const res = await fetch(`${siteUrl}/api/auth/send-verification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
            },
            body: JSON.stringify({
              user: { email: user.email, name: user.name },
              url,
              token,
              clientContext,
            }),
          });
          if (!res.ok) {
            console.error("[sendVerificationEmail] Proxy route failed", await res.text());
          }
        } catch (e) {
          console.error("[sendVerificationEmail] Proxy request error", e);
        }
      },
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
      passkey(),
      twoFactor({
        otpOptions: {
          sendOTP: async ({ user, otp }, request) => {
            try {
              const clientContext = extractClientContext(request);
              const res = await fetch(`${siteUrl}/api/auth/send-2fa-otp`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
                },
                body: JSON.stringify({
                  user: { email: user.email, name: user.name },
                  otp,
                  clientContext,
                }),
              });
              if (!res.ok) {
                console.error("[sendOTP] Proxy route failed", await res.text());
              }
            } catch (e) {
              console.error("[sendOTP] Proxy request error", e);
            }
          },
        },
        skipVerificationOnEnable: true,
      }),
      magicLink({
        sendMagicLink: async ({ email, url, token }, request) => {
          try {
            const clientContext = extractClientContext(request);
            const res = await fetch(`${siteUrl}/api/auth/send-magic-link`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-email-key": process.env.INTERNAL_EMAIL_PROXY_SECRET || "",
              },
              body: JSON.stringify({ email, url, token, clientContext }),
            });
            if (!res.ok) {
              console.error("[sendMagicLink] Proxy route failed", await res.text());
            }
          } catch (e) {
            console.error("[sendMagicLink] Proxy request error", e);
          }
        },
      }),

    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	returns: v.any(),
	handler: async function (ctx) {
		try {
			return await authComponent.getAuthUser(ctx);
		} catch (error) {
			// If unauthenticated, return null instead of throwing
			return null;
		}
	},
});

/**
 * Internal query to get current user (for use in actions)
 */
export const getCurrentUserInternal = internalQuery({
	args: {},
	returns: v.any(),
	handler: async function (ctx) {
		try {
			return await authComponent.getAuthUser(ctx);
		} catch (error) {
			return null;
		}
	},
});