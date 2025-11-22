# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** using **Bun** as the package manager. It's a full-stack TypeScript application combining:
- **Next.js 16** with **React 19** and React Compiler enabled
- **Convex** as the reactive backend-as-a-service
- **Better-Auth** for authentication with Convex adapter
- **TailwindCSS v4** and **shadcn/ui** for styling
- **Resend** for email delivery

## Common Commands

### Development
```bash
bun install                           # Install dependencies
bun run dev                           # Start all apps in dev mode (web on :3001)
bun run dev:web                       # Start only the web app
bun run dev:server                    # Start only the Convex backend
bun run dev:setup                     # Initial Convex project setup (run once)
```

### Build and Type Checking
```bash
bun run build                         # Build all apps
bun run check-types                   # Type check all apps
```

### Turborepo Filters
Use `-F` flag to target specific workspaces:
```bash
turbo -F web dev                      # Run dev in web app only
turbo -F @rescuedawg/backend dev      # Run dev in backend package only
```

## Project Structure

### Monorepo Layout
- `apps/web/` - Next.js frontend application
- `packages/backend/` - Convex backend with database schema and server functions

### Web App (`apps/web/`)
- `src/app/` - Next.js App Router pages
  - `page.tsx` - Landing page with health check
  - `dashboard/` - Protected dashboard with sales assistant
  - `auth/[path]/` - Better-Auth UI routes (catch-all)
  - `account/[path]/` - Account settings routes
  - `api/auth/` - Email proxy endpoints (see Authentication Architecture)
- `src/components/` - React components
  - `ui/` - shadcn/ui components
  - `emails/` - React Email templates for auth flows
  - `dashboard/` - Dashboard-specific components
- `src/lib/` - Utility functions
  - `auth-client.ts` - Better-Auth client instance with plugins
  - `auth-server.ts` - Server-side auth utilities
  - `geo.ts` - Geolocation utilities
- `src/hooks/` - Custom React hooks

### Backend (`packages/backend/convex/`)
- `auth.ts` - Better-Auth server configuration with Convex adapter
- `auth.config.ts` - Auth plugin configuration
- `schema.ts` - Convex database schema definitions
- `http.ts` - HTTP router for Better-Auth endpoints
- `todos.ts` - Example Convex functions
- `_generated/` - Auto-generated Convex API types (do not edit)

## Architecture

### Authentication System

**Better-Auth with Convex Adapter**: Authentication is handled by Better-Auth using Convex as the database backend. The system includes:

**Enabled Features**:
- Email/password authentication with optional email verification
- Google OAuth social login
- Passkey (WebAuthn) support
- Two-factor authentication (2FA) via email OTP
- Magic link authentication
- Password reset flow
- User deletion

**Email Proxy Pattern**:
Because Convex functions run in an isolated environment without direct access to external email services, email sending is proxied through Next.js API routes:

1. Better-Auth triggers email callback (e.g., `sendVerificationEmail`) in `packages/backend/convex/auth.ts`
2. Callback makes HTTP request to Next.js API route (`/api/auth/send-verification-email`)
3. API route renders React Email template and sends via Resend
4. Includes security header `x-internal-email-key` for request validation

**Client Context Extraction**: Auth callbacks extract client metadata (IP, user agent, geolocation) from request headers and pass to email templates for security notifications.

**Dual Origin Support**: Config includes `trustedOrigins` array to allow both local dev (`localhost:3001`) and tunnel URLs (ngrok) for testing auth flows with real email links.

### Environment Variables

**Web App** (`.env` in `apps/web/`):
```bash
NEXT_PUBLIC_CONVEX_SITE_URL=          # Convex site URL (*.convex.site)
NEXT_PUBLIC_CONVEX_URL=               # Convex deployment URL
SITE_URL=http://localhost:3001        # Your frontend URL
CONVEX_DEPLOYMENT=                    # Convex deployment ID
NGROK_WEBHOOK_URL=                    # Optional: ngrok URL for testing emails
INTERNAL_EMAIL_PROXY_SECRET=          # Secret for validating email proxy requests
RESEND_API_KEY=                       # Resend API key
RESEND_FROM=                          # Verified sender email address
```

**Backend** (set via `npx convex env set KEY value`):
```bash
BETTER_AUTH_SECRET                    # Generate: openssl rand -base64 32
INTERNAL_EMAIL_PROXY_SECRET           # Must match web app value
SITE_URL                              # Must match web app value
NEXT_PUBLIC_CONVEX_SITE_URL           # Convex site URL
CONVEX_URL                            # Set automatically by Convex
GOOGLE_CLIENT_ID                      # Google OAuth credentials
GOOGLE_CLIENT_SECRET                  # Google OAuth credentials
NGROK_WEBHOOK_URL                     # Optional: for webhook testing
```

**Setup Note**: Run `bun run dev:setup` to initialize Convex and get deployment URLs. Then populate environment variables in both locations.

### TypeScript Configuration

- Base config in `tsconfig.base.json` with strict mode enabled
- `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` are all enabled
- Next.js uses `reactCompiler: true` and `typedRoutes: true`
- All packages use ESM (`"type": "module"`)

### Convex Patterns

**Queries**: Read-only functions for fetching data. Use `useQuery` hook in React.
```ts
export const myQuery = query({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

**Mutations**: Functions that modify data. Use `useMutation` hook in React.
```ts
export const myMutation = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tableName", { text: args.text });
  },
});
```

**Actions**: Long-running functions that can call external APIs. Cannot directly access database - use `ctx.runQuery` or `ctx.runMutation`.

**Getting Current User**: Use `authComponent.getAuthUser(ctx)` in Convex functions to get authenticated user data.

### Styling Patterns

- **TailwindCSS v4** with PostCSS
- **shadcn/ui** components in `src/components/ui/`
- Dark mode support via `next-themes`
- Framer Motion for animations
- Class variance authority (CVA) for component variants

## Key Integration Points

### Convex Backend Import in Frontend
```ts
import { api } from "@rescuedawg/backend/convex/_generated/api";
```
The `@rescuedawg/backend` workspace package exports generated Convex API types.

### Better-Auth Plugin Registration

**Client** (`apps/web/src/lib/auth-client.ts`):
```ts
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { passkeyClient, twoFactorClient } from "better-auth/client/plugins";
```

**Server** (`packages/backend/convex/auth.ts`):
```ts
import { convex } from "@convex-dev/better-auth/plugins";
import { passkey, twoFactor, magicLink } from "better-auth/plugins";
```

Plugins must be registered on both client and server for features to work.

## Development Workflow

1. **Initial Setup**: Run `bun install` then `bun run dev:setup` to configure Convex
2. **Environment Setup**: Copy `.env.example` files and populate required values
3. **Start Development**: Run `bun run dev` to start all services
4. **Access Application**: Open `http://localhost:3001`

### Adding New Convex Functions
1. Create file in `packages/backend/convex/`
2. Define functions using `query`, `mutation`, or `action`
3. Convex automatically regenerates types in `_generated/`
4. Import and use via `api.fileName.functionName` in frontend

### Adding New Better-Auth Features
1. Add plugin to `createAuth` in `packages/backend/convex/auth.ts`
2. Add corresponding client plugin to `apps/web/src/lib/auth-client.ts`
3. If plugin requires email sending, add proxy endpoint in `apps/web/src/app/api/auth/`
4. Create email template in `apps/web/src/components/emails/`

### Working with Emails
- Email templates use React components from `@react-email`
- Common components are in `email-common.tsx`
- Templates receive user data and client context for personalization
- Test locally by hitting API routes directly or using ngrok for real email delivery
