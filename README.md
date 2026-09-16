# Momentum Labz CRM

Internal CRM for Momentum Labz — built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in your Supabase project → **Project Settings → API**.

### 3. Run the database schema

1. Go to your [Supabase project](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`
4. Then paste and run `supabase/seed.sql` (inserts the 9 default pipeline stages)

### 4. Enable Supabase Auth

In your Supabase dashboard:

1. Go to **Authentication → Providers → Email** — make sure it's enabled
2. For magic links: ensure **Email OTP** is enabled under Auth settings
3. Set your **Site URL** to `http://localhost:3000` for local development
4. Add `http://localhost:3000/auth/callback` to your **Redirect URLs** allowlist

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth routes (no sidebar/topbar)
│   │   ├── layout.tsx       # Centered layout for login page
│   │   └── login/page.tsx   # Email/password + magic link login
│   ├── (app)/               # Protected app routes (with sidebar/topbar)
│   │   ├── layout.tsx       # App shell: sidebar + topbar + main
│   │   ├── page.tsx         # /  → Dashboard
│   │   ├── leads/page.tsx   # /leads → Leads
│   │   ├── tasks/page.tsx   # /tasks → Tasks & Follow-ups
│   │   ├── proposals/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── auth/callback/route.ts  # Magic link / OAuth callback
│   ├── layout.tsx           # Root layout (Inter font, globals.css)
│   └── globals.css          # Design system CSS tokens + base styles
├── components/
│   ├── shell/
│   │   ├── Sidebar.tsx      # 240px sidebar with nav groups
│   │   └── Topbar.tsx       # 64px topbar with search + notifications
│   └── ui/
│       └── EmptyState.tsx   # Reusable empty state component
├── lib/supabase/
│   ├── client.ts            # Browser-side Supabase client
│   └── server.ts            # Server-side Supabase client (cookies)
├── middleware.ts             # Auth session refresh + route protection
└── types/
    └── supabase.ts          # TypeScript types matching DB schema

supabase/
├── schema.sql               # Full DDL — run once in SQL Editor
└── seed.sql                 # Default pipeline stages — run after schema

public/
└── logo.png                 # Momentum Labz logo (transparent bg)
```

---

## Design System

All styling follows `momentumlabzz_CRM_Design_System_v1.0` exactly:

- **Colors:** Custom neutral ramp (neutral-0 through neutral-900), Muted Gold accent (#C8A84B), semantic status tokens — all in `globals.css` and `tailwind.config.ts`
- **Typography:** Inter, 8-step scale from `display` (32px) to `micro` (11px uppercase), tabular numerals on all numeric content
- **Radius:** sm=6px, md=10px, lg=16px, full=999px
- **Shadows:** Extremely subtle flat+soft aesthetic, no heavy shadows on resting cards
- **Motion:** All transitions 120–220ms ease-out

---

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # Production build (TypeScript check included)
npm run lint     # ESLint
```

---

## Phase Roadmap

| Phase | Content |
|---|---|
| **Phase 0** done | Project setup, design tokens, schema, auth, app shell |
| Phase 1 | Lead list/Kanban, add/edit form, detail drawer, CSV import |
| Phase 2 | Tasks/follow-ups, full dashboard (KPI cards, charts) |
| Phase 3 | Proposals, tags, settings pages |
| Phase 4 | Analytics and reports |
| Phase 5 | Client portal bridge |
| Phase 6 | Command palette, mobile pass, notifications |
