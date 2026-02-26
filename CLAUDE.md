# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ACES Text Agent Interface — a Next.js 15 dashboard frontend for ACES (ACE Solutions), an energy consulting business. The app provides tools for utility invoice management, client CRM, document generation, and an AI-powered Base 1 Review agent for analysing utility bills. It communicates with a separate FastAPI backend (`text_agent_backend`) via REST APIs.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:8080 or :3000 depending on config)
npm run build    # Production build (standalone output)
npm run lint     # ESLint (next/core-web-vitals config)
npm start        # Start production server

# Docker
docker build -t acesagentinterface .
docker run -p 8080:8080 --env-file .env.local acesagentinterface
```

No test framework is configured — there are no test commands.

## Architecture

### Stack
- **Next.js 15** (App Router) with React 19, TypeScript, Tailwind CSS 3
- **Auth**: NextAuth v4 with Google OAuth (JWT strategy). Domain-restricted to `acesolutions.com.au` (enforced in `src/app/providers.tsx` AuthGate)
- **Styling**: Tailwind CSS with custom theme (Satoshi font, `primary: #5750F1`). Dark mode via `next-themes` (class strategy). Prettier plugin sorts Tailwind classes.
- **Backend**: Separate FastAPI server. URL resolved dynamically in `src/lib/utils.ts` (`getApiBaseUrl`) — dev defaults to `localhost:8000`, prod/preview uses Cloud Run URLs

### Key Directory Layout
- `src/app/` — Next.js App Router pages. Route groups: `(home)` for dashboard home
- `src/app/api/` — Next.js API routes (auth, PDF merging, quote requests, floating agent, one-month-savings, Canva/Google integrations)
- `src/components/` — Shared components. `Layouts/` contains Sidebar, Header, PageHeader. `ui/` has reusable primitives (card, toast, breadcrumb, dropdown, skeleton, table, empty-state)
- `src/lib/` — Core utilities: `auth.ts` (NextAuth config + token refresh), `utils.ts` (`cn()` helper + `getApiBaseUrl`), `route-titles.ts` (pathname→title map), `floatingagent/`
- `src/constants/crm.ts` — CRM stage/status enums (`CLIENT_STAGES`, `OFFER_STATUSES`, `OFFER_ACTIVITY_TYPES`) — must match backend enums
- `types/next-auth.d.ts` — NextAuth session type augmentation (accessToken, id_token, refreshToken)

### App Layout
Root layout (`src/app/layout.tsx`) wraps all pages with: Sidebar + Header + FloatingAgentChat + CommandPalette. Provider stack in `providers.tsx`: SessionProvider → ThemeProvider → SidebarProvider → ToastProvider → CommandPaletteProvider → AuthGate.

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

### Navigation
Sidebar nav defined in `src/components/Layouts/sidebar/data/index.ts`. Route titles for the header in `src/lib/route-titles.ts`. Add entries to both when creating new pages.

### Environment Variables
Required in `.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_API_BASE_URL`. See `.env.example`.

### Deployment
Google Cloud Build → Cloud Run (region: `australia-southeast2`). Config in `cloudbuild.yaml`. Docker uses standalone Next.js output on port 8080. `NEXT_PUBLIC_API_BASE_URL` is passed as a build arg.

### CRM Model
Clients flow through stages: Lead → Qualified → LOA Signed → Data Collected → Analysis In Progress → Offer Sent → Won/Lost/Existing Client. Offers have separate statuses: Requested → Awaiting Response → Response Received → Accepted/Lost. All stage/status constants live in `src/constants/crm.ts`.

### Base 1 Review
Public (no auth) lead-magnet feature at `/base-1`. Users upload utility PDFs, backend extracts data and generates Excel workbook + PDF summary. Backend endpoints under `/api/base1/`.

### Large Files
`src/components/InfoToolPage.tsx` (~334KB) and `src/components/BusinessInfoDisplay.tsx` (~191KB) are very large monolithic components. Read specific line ranges when working with these.
