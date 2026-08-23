# The Pool Hub

## Project Overview

This repository contains a mobile-first business management application for a pool opening and closing business.

The primary user is Branden, the business owner.

The application will initially support a single business but the architecture must support multiple users/businesses in the future.

## Source of Truth

Before implementing features, read:

- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/DATABASE.md
- docs/API.md

These documents define the current requirements and architecture.

If the implementation conflicts with these documents, stop and explain the conflict rather than silently changing the requirements.

## Technology Stack

- Mobile: React Native + Expo + TypeScript
- Web: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL hosted by Supabase
- Authentication: Supabase Auth
- Database ORM: Drizzle ORM
- Package manager: npm
- Source control: Git

## Development Principles

### Keep scope under control

Only implement functionality requested by the current task.

Do not add features because they might be useful later.

Do not implement future features listed in PRODUCT.md unless explicitly requested.

### Prefer simple solutions

Use the simplest architecture that satisfies the requirements.

Avoid unnecessary abstractions, wrappers, services, factories, or utility layers.

Do not create a generic framework for problems that only occur once.

### TypeScript

Use TypeScript throughout the project.

Avoid `any`.

Prefer explicit types and shared types where appropriate.

### Security

Never commit secrets.

Never hardcode:

- passwords
- API keys
- database credentials
- Supabase service role keys
- authentication secrets

Use environment variables.

Never expose the Supabase service role key to mobile or web clients.

Never bypass Row Level Security from a client application.

### Database

PostgreSQL is the source of truth for persistent application data.

Respect the existing schema in docs/DATABASE.md.

Do not create duplicate tables for concepts that already exist.

For example:

- Do not create open_orders and closed_orders.
- Use orders.order_type and orders.status.

### API

API routes should follow docs/API.md.

Use `/api/v1` for application API routes.

Validate request input.

Use centralized error handling.

Return consistent API responses.

### Authentication

Supabase Auth handles authentication.

Do not implement custom password hashing or password storage.

Authenticated users must only be able to access their own data.

### Code Quality

Write readable code.

Use clear variable and function names.

Keep functions reasonably small.

Avoid duplicated logic.

Do not leave debug logging in production code.

Do not leave TODO comments unless the TODO represents an intentionally deferred requirement.

### Dependencies

Do not install a dependency without a reason.

Before adding a dependency, determine whether the functionality can reasonably be implemented with existing tools or the platform.

Prefer well-maintained, established libraries.

### Testing

Add tests for important backend business logic and API behavior.

Do not spend excessive effort testing trivial UI rendering during the initial MVP.

### Git

Make small, logical commits.

Do not modify unrelated files.

Before completing a task:

1. Run relevant tests.
2. Run linting if configured.
3. Run TypeScript checks if configured.
4. Review the changes.
5. Report what changed and any issues.

## Claude Code Behavior

Before making substantial changes:

1. Inspect the existing repository.
2. Read the relevant documentation.
3. Determine what already exists.
4. Make a short implementation plan.
5. Implement only the requested task.
6. Verify the implementation.

Do not rewrite working code unnecessarily.

Do not create files unless they are needed.

Do not modify project architecture without explaining why.

If requirements are ambiguous and the ambiguity materially affects architecture or data, ask for clarification before implementing.

For small implementation details that do not materially affect architecture, use reasonable judgment and proceed.

## Current Development Phase

The project is currently in the initial scaffolding phase.

The immediate goal is to establish:

- Monorepo structure
- Mobile application
- Web application
- Express backend
- Shared TypeScript package
- Development tooling

Do not implement the complete application yet.