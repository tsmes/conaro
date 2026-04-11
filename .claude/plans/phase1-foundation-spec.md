# Phase 1: Foundation — Project Setup & Authentication

## Problem Statement

Art Apply has no codebase yet. Before any feature work can begin, the project needs scaffolding (Next.js 15, TypeScript, Tailwind, shadcn/ui), a database (PostgreSQL in Docker with Drizzle ORM), authentication (Auth.js v5), and basic navigation. This phase implements the four authentication user stories (US-001 through US-004) with two distinct registration paths for artists and organizers.

## Requirements

- **[REQ-1]** Project initialized with Next.js 15 (App Router), TypeScript (strict mode), Tailwind CSS, and shadcn/ui
- **[REQ-2]** Local PostgreSQL running via Docker Compose for development
- **[REQ-3]** Drizzle ORM configured with initial schema: Auth.js tables (users, accounts, sessions), profiles table (with role column), and conventions table (created during organizer registration)
- **[REQ-4]** Auth.js v5 with Credentials provider for email/password authentication; sessions stored in PostgreSQL via Drizzle adapter
- **[REQ-5]** Role selection landing page at `/register` showing two cards — "I'm an Artist" and "I organize a Convention" — linking to their respective registration forms
- **[REQ-6]** Artist registration at `/register/artist` with fields: email, password, confirm password, display name. Email validated for format and uniqueness. Password minimum 8 characters. On success, creates user + artist profile, redirects to `/dashboard`
- **[REQ-7]** Organizer registration at `/register/organizer` with fields: email, password, confirm password, display name, convention name. Same validation as artist. On success, creates user + organizer profile + convention record, redirects to `/conventions`
- **[REQ-8]** Login at `/login` with email and password. Generic error message on invalid credentials (does not reveal which field is wrong). Redirects to role-appropriate dashboard after login
- **[REQ-9]** Logout button visible in the header when logged in. Clears session and redirects to homepage
- **[REQ-10]** Middleware-based route protection: `/dashboard` and artist routes require artist role; `/conventions` and organizer routes require organizer role. Unauthenticated users redirected to `/login`
- **[REQ-11]** Basic layout with header showing: app name/logo, navigation links appropriate to the user's role, and auth controls (login/register when logged out, logout when logged in)

## Scope

### In Scope

- Project scaffolding and tooling configuration
- Docker Compose with PostgreSQL for local development
- Drizzle ORM setup, initial schema, and migration
- Auth.js v5 configuration with Credentials provider and Drizzle adapter
- Registration landing page (`/register`) with role selection
- Artist registration form and flow (`/register/artist`)
- Organizer registration form and flow (`/register/organizer`)
- Login form and flow (`/login`)
- Logout action
- Role-based route protection middleware
- Basic app layout (header with navigation and auth controls)
- Stub dashboard pages (`/dashboard` for artists, `/conventions` for organizers) as redirect targets — just a heading and shell, no real content yet
- Homepage with brief description and links to register/login

### Out of Scope

- Email verification (not in PRD)
- Password reset / forgot password
- OAuth providers (Google, GitHub, etc.) — Credentials only
- Artist profile editing (Phase 2)
- Convention profile editing (Phase 3)
- Any real dashboard content beyond a stub page
- Deployment configuration (Railway, CI/CD)
- Image upload or R2 integration
- Notification system

## Acceptance Criteria

- [ ] `docker compose up` starts PostgreSQL and the app can connect to it
- [ ] `npm run dev` starts the Next.js dev server without errors
- [ ] Visiting `/register` shows two cards — artist and organizer — linking to their forms
- [ ] Submitting `/register/artist` with valid data creates a user with artist role and redirects to `/dashboard`
- [ ] Submitting `/register/organizer` with valid data creates a user with organizer role, creates a convention record, and redirects to `/conventions`
- [ ] Registration rejects duplicate emails with a user-facing error
- [ ] Registration rejects passwords shorter than 8 characters with a user-facing error
- [ ] Submitting `/login` with valid credentials redirects to the role-appropriate dashboard
- [ ] Submitting `/login` with invalid credentials shows a generic error that does not reveal which field is wrong
- [ ] Clicking logout clears the session and redirects to the homepage
- [ ] Visiting `/dashboard` while logged out redirects to `/login`
- [ ] Visiting `/conventions` while logged out redirects to `/login`
- [ ] An artist visiting `/conventions` is redirected away (cannot access organizer routes)
- [ ] An organizer visiting `/dashboard` is redirected away (cannot access artist routes)
- [ ] Header shows login/register links when logged out, and logout + role-appropriate nav when logged in
- [ ] TypeScript compiles with no errors (`npm run build` succeeds)
- [ ] ESLint passes with no errors
