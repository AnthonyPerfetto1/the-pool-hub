
# Application Architecture

## Overview

The application consists of three primary applications:

1. React Native mobile application
2. React web application
3. Node.js/Express backend API

PostgreSQL is hosted by Supabase.

Supabase Auth manages authentication.

## Technology Stack

### Mobile

- React Native
- Expo
- TypeScript

### Web

- React
- Vite
- TypeScript

### Backend

- Node.js
- Express
- TypeScript

### Database

- PostgreSQL
- Supabase

### Authentication

- Supabase Auth

### ORM / Database Access

- Drizzle ORM

### Source Control

- Git
- GitHub

## High-Level Architecture

```text
                  ┌─────────────────────┐
                  │   React Native      │
                  │   Expo Mobile App   │
                  └──────────┬──────────┘
                             │
                             │ HTTPS
                             │
                  ┌──────────▼──────────┐
                  │                     │
                  │    Express API      │
                  │    Node.js          │
                  │                     │
                  └──────────┬──────────┘
                             │
                             │
                  ┌──────────▼──────────┐
                  │                     │
                  │    PostgreSQL       │
                  │    Supabase         │
                  │                     │
                  └─────────────────────┘
                             ▲
                             │
                             │ HTTPS
                             │
                  ┌──────────┴──────────┐
                  │                     │
                  │    React Web App    │
                  │    Vite             │
                  │                     │
                  └─────────────────────┘

### REPOSITORY Structure:
pool-business/
│
├── apps/
│   ├── mobile/
│   └── web/
│
├── server/
│
├── packages/
│   └── types/
│
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── API.md
│
├── .gitignore
└── README.md

Shared Types
The packages/types package should contain TypeScript types shared between applications.
Examples:
Customer
Order
Transaction
Profile
OrderStatus
OrderType
PaymentMethod
The mobile app, web app, and server should use shared types where appropriate.
Backend Responsibilities
The Express API is responsible for:
Application business logic
Request validation
Authentication verification
Database operations
Consistent API responses
Error handling
The backend should not duplicate authorization rules already enforced by PostgreSQL RLS, but it should still validate authentication and input.
Frontend Responsibilities
The mobile and web applications are responsible for:
User interface
Navigation
Form handling
Client-side validation
Displaying API data
User feedback
Authentication state
Business-critical authorization must never rely solely on frontend code.
Database Responsibilities
PostgreSQL is responsible for:
Data persistence
Relationships
Referential integrity
Constraints
Row Level Security
Timestamps
Data ownership
Development Principles
Keep the MVP small
Do not implement features that are not required by V1.
Avoid premature abstraction
Only create abstractions when they solve a real problem.
Prefer simple code
The application is intended to be maintainable by a small development team.
Type everything
TypeScript should be used throughout the application.
Avoid any unless there is a specific justified reason.
Validate input
All API inputs should be validated before database operations.
Handle errors centrally
The Express backend should use centralized error handling.
Never commit secrets
Environment variables must be stored in .env files.
.env files must never be committed to Git.
An .env.example file should document required environment variables without containing secrets.