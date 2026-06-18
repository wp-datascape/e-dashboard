# shared/architecture.md

## Request Flow
React SPA (Vite)

| HTTPS + Cookie + X-CSRF-Token

| dev: MSW Service Worker intercepts axios

Hono Router (Bun)

| Middleware chain:

| CORS -> CSRF -> RateLimit -> Auth -> RequirePermission -> CompanyAccess

Handler -> Service -> Repository -> PostgreSQL

-> utils/accurate.ts -> Accurate Online API

-> utils/audit.ts   -> audit_logs table

## Folder Structure

### Backend
backend/

src/

routes/         # Hono route definitions

handlers/       # Request validation + response shaping

services/       # Business logic + audit calls

repositories/   # Drizzle ORM queries

db/

schema/       # Drizzle table definitions (snake_case plural)

migrations/   # drizzle-kit generated

middleware/     # cors, csrf, auth, permission, company-access

utils/          # response, error, jwt, hash, csrf, audit, parser, accurate, validator, logger

types/          # Shared TypeScript types

### Frontend
frontend/

src/

api/            # All axios calls — never fetch directly in components

axios.ts      # Axios instance with CSRF interceptor

components/     # Reusable UI — PascalCase.tsx + index.ts re-export

charts/       # 9 chart widgets (Recharts)

hooks/          # Custom hooks — logic separated from UI

pages/          # Route-level page components

route/

routes.tsx    # routeRegistry — register all pages here

config/

menu.tsx      # NAV_ITEMS — sidebar menu definition

mocks/

handlers/     # MSW handlers per domain

handlers.ts   # Imports all handlers

context/

AuthContext   # JWT state + permissions[]

types/          # API response types

## Middleware Chain Detail
CORS              — whitelist from env

CSRF              — validate X-CSRF-Token on mutations

RateLimit         — per IP

Auth              — verify JWT from httpOnly cookie

RequirePermission — check permission string e.g. "metrics:read"

CompanyAccess     — verify user has access to requested company_id

(superadmin + admin bypass this)

## Dev Setup
```bash
# Database
docker-compose up -d postgres

# Backend
cd backend && cp .env.example .env
bun install
bun run db:migrate
bun run db:seed
bun run dev

# Frontend
cd frontend && cp .env.example .env
bun install
bun run dev
```

## MSW Mock Domains (dev only — active when import.meta.env.DEV)
auth     — login, logout, refresh, /me

page     — page ready flags

dashboard — metrics summary

metrics  — per-metric endpoints

## Key Architecture Decisions
- Monolith modular — single repo, single deploy, split by domain folders
- No separate microservices for MVP
- Single PostgreSQL DB, company isolation via company_id column
- Metrics computed on-demand, cached in metric_cache table
- Accurate API fetched server-side only — API key never sent to frontend
- Auth cookie: httpOnly; Secure; SameSite=Strict
- Dev auth: localStorage + MSW — migrate to httpOnly cookie when backend ready
