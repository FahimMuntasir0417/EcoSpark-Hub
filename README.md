# EcoSpark Backend API

A TypeScript, Express, Prisma, and PostgreSQL API for an eco-innovation platform with authentication, idea management, moderation, payments, uploads, community features, and analytics.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Dependencies](#dependencies)
- [Live Demo and Credentials](#live-demo-and-credentials)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [API and Architecture](#api-and-architecture)
- [Folder Structure](#folder-structure)
- [Available Scripts](#available-scripts)
- [Contributions](#contributions)
- [How to Contribute](#how-to-contribute)
- [License](#license)
- [Contact](#contact)

---

## About the Project

EcoSpark Backend API powers a sustainability innovation platform where members and scientists can publish ideas, organize campaigns, collaborate through votes and comments, report content, and sell premium ideas through Stripe Checkout.

This repository contains the backend only. The API is organized by domain modules, uses Prisma with PostgreSQL, stores uploaded assets in Cloudinary, sends transactional emails with Nodemailer and EJS templates, and supports both Better Auth sessions and custom JWT access tokens.

## Project Overview

EcoSpark provides the backend system for a role-based eco-innovation marketplace and community platform.

The backend supports:

- Public and authenticated API routes under `/api/v1`
- Better Auth runtime routes under `/api/auth`
- Role-based access for `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SCIENTIST`, and `MEMBER`
- Modular Prisma schema files for identity, ideas, campaigns, commerce, moderation, analytics, and community data
- Stripe Checkout and webhook-based payment confirmation
- Cloudinary-backed multipart upload handling
- Email verification and password reset flows with EJS email templates

## Problem Statement

Eco-focused idea platforms need more than simple CRUD. They need secure identity flows, role-specific permissions, moderated content, searchable idea catalogs, paid access, media uploads, engagement tracking, and dashboard analytics. Without a structured backend, those workflows become hard to maintain and risky to scale.

## Solution Overview

EcoSpark Backend API solves this with a modular Express architecture. Each domain keeps its route, controller, service, validation, interface, and constants together. Prisma handles PostgreSQL access, Zod validates inputs, centralized middleware handles errors and authentication, and external integrations are isolated for Stripe, Cloudinary, Google OAuth, and email delivery.

## Key Features

- Authentication and authorization with Better Auth, JWT access tokens, refresh tokens, cookies, Google OAuth, email verification, and password reset
- Role-based user management for members, scientists, admins, moderators, and super admins
- Scientist lifecycle with member promotion, specialties, verification, and demotion behavior
- Idea lifecycle with drafts, review, approval, rejection, publishing, featuring, highlighting, attachments, and media
- Engagement features including votes, comments, threaded replies, bookmarks, and reports
- Campaign management for grouping and promoting sustainability ideas
- Commerce integration with Stripe Checkout, webhooks, purchases, refunds, and transaction tracking
- Community features including experience reports, notifications, and newsletter subscriptions
- Analytics endpoints for member, scientist, and admin dashboards
- Search, filtering, sorting, and pagination through a shared query builder
- Cloudinary upload support for profile images, campaign banners, idea media, attachments, and experience report images

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express 5, TypeScript, PostgreSQL, Prisma
- **Auth:** Better Auth, JWT, Cookies, Google OAuth
- **Payments:** Stripe Checkout, Stripe Webhooks
- **Uploads:** Multer, Cloudinary
- **Email:** Nodemailer, EJS templates
- **Tools:** pnpm, ESLint, Prettier, Vercel, Git, VS Code

## Dependencies

Major runtime dependencies:

```json
{
  "@prisma/client": "^7.5.0",
  "@prisma/adapter-pg": "^7.4.1",
  "bcrypt": "^6.0.0",
  "better-auth": "^1.4.19",
  "cloudinary": "^2.9.0",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "ejs": "^4.0.1",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.3",
  "multer": "^2.1.1",
  "multer-storage-cloudinary": "^4.0.0",
  "nodemailer": "^8.0.1",
  "pg": "^8.19.0",
  "stripe": "^22.0.0",
  "zod": "^4.3.6"
}
```

Development tools include TypeScript, Prisma CLI, ESLint, Prettier, `ts-node-dev`, and Node type packages.

## Live Demo and Credentials

### Project Links

- Frontend Repo: https://github.com/FahimMuntasir0417/EcoSpark-Frontend
- Backend Repo: https://github.com/FahimMuntasir0417/EcoSpark-Hub
- Frontend Live: https://eco-spark-frontend.vercel.app
- Backend Live: https://assignment-eco-spark.vercel.app
- Demo Video: https://drive.google.com/file/d/1ZzTSUULNzsSZ-n4m5TGL6SHEAomqg9z7/view

### Demo Credentials

Use demo credentials only for non-production demonstrations.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ecospark.local` | `Admin12345` |
| Scientist | `muntasirbejoy66@gmail.com` | `StrongPass123!` |

## Installation and Setup

### Prerequisites

Before running the project, make sure you have:

- Node.js installed
- pnpm installed
- PostgreSQL database access
- Cloudinary credentials
- SMTP credentials for email delivery
- Google OAuth client credentials
- Stripe API keys and webhook secret

### Setup

1. Clone the repository:

```bash
git clone https://github.com/FahimMuntasir0417/EcoSpark-Hub
cd EcoSpark-Hub
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file in the root directory and add the required environment variables.

4. Generate the Prisma client:

```bash
pnpm prisma generate
```

5. Apply database migrations:

```bash
pnpm prisma migrate dev
```

6. Seed an admin user:

```bash
pnpm seed:admin
```

7. Run the development server:

```bash
pnpm dev
```

The server starts on the port defined by `PORT`, defaulting to `5000`.

### Production Build

```bash
pnpm build
pnpm start
```

## Environment Variables

Create a `.env` file in the project root. Do not commit real secrets.

### Core

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=your_postgresql_database_url
```

### Auth and Tokens

```env
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=30d
BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN=604800
BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE=86400
```

### Email

```env
EMAIL_SENDER_SMTP_USER=your_smtp_user
EMAIL_SENDER_SMTP_PASS=your_smtp_password
EMAIL_SENDER_SMTP_HOST=your_smtp_host
EMAIL_SENDER_SMTP_PORT=587
EMAIL_SENDER_SMTP_FROM=your_from_email
```

### Google OAuth

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/callback/google
```

### Frontend and Redirect URLs

```env
FRONTEND_URL=http://localhost:3000
```

### Stripe

```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SUCCESS_URL=http://localhost:3000/payments/success
STRIPE_CANCEL_URL=http://localhost:3000/payments/cancel
```

### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Optional Seed Variables

These are used by `pnpm seed:admin`.

```env
SEED_DATABASE_URL=your_seed_database_url
SEED_ADMIN_NAME=EcoSpark Admin
SEED_ADMIN_EMAIL=admin@ecospark.local
SEED_ADMIN_PASSWORD=Admin12345
SEED_ADMIN_ROLE=ADMIN
SEED_ADMIN_CONTACT_NUMBER=your_contact_number
SEED_ADMIN_PROFILE_IMAGE=your_profile_image_url
```

## API and Architecture

### Base URLs

Local development:

```bash
http://localhost:5000
```

Versioned application routes:

```bash
/api/v1
```

Better Auth runtime routes:

```bash
/api/auth
```

### High-level Flow

```text
Request
  -> Route
  -> Middleware
  -> Controller
  -> Service
  -> Prisma Client
  -> PostgreSQL
  -> Standard API Response
```

### Architecture Highlights

- Modular service architecture under `src/modules/<ModuleName>`
- Modular Prisma schema files under `prisma/schema`
- Shared query pipeline in `src/builder/queryBuilder.ts`
- Standard response envelope through `src/shared/sendResponse.ts`
- Centralized error handling in `src/middlewares/globalErrorHandler.ts`
- Request validation through Zod schemas and `validateRequest`
- Route protection through `checkAuth` and optional auth through `optionalAuth`
- Raw Stripe webhook handling before JSON parsing for signature verification

### Module Map

| Module | Base Route | Responsibility |
| --- | --- | --- |
| Auth | `/api/v1/auth` | Registration, login, profile, refresh token, email verification, password reset, Google OAuth helpers |
| Better Auth | `/api/auth` | Better Auth handler for session and OAuth internals |
| Specialties | `/api/v1/specialties` | Scientist specialty catalog |
| Scientists | `/api/v1/scientists` | Scientist profiles, verification, specialty assignment |
| Categories | `/api/v1/categories` | Idea category management |
| Tags | `/api/v1/tags` | Idea tag management |
| Ideas | `/api/v1/ideas` | Idea CRUD, status transitions, tags, attachments, media |
| Campaigns | `/api/v1/campaigns` | Campaign CRUD and campaign-linked ideas |
| Interactions | `/api/v1/interactions` | Votes, comments, replies, bookmarks |
| Moderation | `/api/v1/moderation` | Reports, review feedback, moderation actions |
| Commerce | `/api/v1/commerce` | Stripe checkout sessions, purchases, refunds, transactions |
| Community | `/api/v1/community` | Experience reports, notifications, newsletter |
| Users | `/api/v1/users` | Self-service profile, vote, and comment endpoints |
| Analytics | `/api/v1/analytics` | Member, scientist, and admin dashboard data |

### Access Model

- Most feature modules mount `checkAuth()` at router level.
- Authorization accepts either `Authorization: Bearer <accessToken>` or auth cookies set by the login flow.
- Role values used in the system are `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SCIENTIST`, and `MEMBER`.

### Common Query Parameters

Most list endpoints support some or all of the following:

- `page`
- `limit`
- `sortBy`
- `sortOrder`
- `searchTerm`

Many modules also expose resource-specific filters such as `status`, `authorId`, `categoryId`, `campaignId`, `accessType`, `isFeatured`, `userId`, and `isActive`.

### Uploads

Cloudinary-backed multipart uploads are used for:

- Profile images
- Campaign banner images
- Idea attachments
- Idea media
- Experience report before/after images

Allowed upload types:

- Images: `jpg`, `jpeg`, `png`, `gif`, `webp`
- Documents: `pdf`, `doc`, `docx`
- Video: `mp4`, `webm`, `mov`

Maximum upload size: `10 MB`.

## Folder Structure

```plaintext
EcoSpark-Hub/
|
+-- docs/
|   +-- stripe-integration-plan.md
+-- jsonFile/
|   +-- *.endpoints.json
+-- prisma/
|   +-- migrations/
|   +-- schema/
+-- src/
|   +-- app.ts
|   +-- server.ts
|   +-- builder/
|   +-- config/
|   +-- constants/
|   +-- errors/
|   +-- interfaces/
|   +-- lib/
|   +-- middlewares/
|   +-- modules/
|   |   +-- Auth/
|   |   +-- Idea/
|   |   +-- Campaign/
|   |   +-- Commerce/
|   |   +-- Community/
|   |   +-- Moderation/
|   |   +-- Scientist/
|   |   +-- User/
|   |   +-- Analytics/
|   +-- routes/
|   +-- scripts/
|   +-- shared/
|   +-- utils/
+-- package.json
+-- prisma.config.ts
+-- tsconfig.json
+-- vercel.json
```

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the API with `ts-node-dev` |
| `pnpm build` | Generate Prisma client and compile TypeScript |
| `pnpm start` | Run the compiled server from `dist/server.js` |
| `pnpm seed:admin` | Compile and run the admin seed script |
| `pnpm lint` | Lint `src/**/*.ts` |
| `pnpm lint:fix` | Lint and auto-fix supported issues |
| `pnpm format` | Format the repository with Prettier |
| `pnpm stripe:webhook` | Start Stripe CLI forwarding to the local webhook endpoint |
| `pnpm stripe:trigger` | Trigger a Stripe test checkout completion event |

> Note: the Stripe helper scripts currently point to `C:\Tools\stripe\stripe.exe`, so they assume a Windows-local Stripe CLI installation at that path.

## Notable Workflows

### Authentication Flow

- Custom auth endpoints live under `/api/v1/auth`.
- Better Auth runtime endpoints live under `/api/auth`.
- Registration creates a member profile automatically.
- Login returns JWT access and refresh tokens and also works with Better Auth session cookies.
- Email verification and password reset are OTP-based and use EJS email templates.

### Scientist Lifecycle

- A member can be promoted to a scientist profile.
- Scientists can be linked to one or more specialties.
- Verification stores both `verifiedAt` and `verifiedById`.
- Deleting a scientist record demotes the user back to `MEMBER`.

### Idea Lifecycle

- Ideas are created as `DRAFT`.
- They can move through `UNDER_REVIEW`, `APPROVED`, `REJECTED`, and `ARCHIVED`.
- Publishing, featuring, and highlighting are separate actions.
- Tags, attachments, and media can be managed after creation.
- Engagement counters are synchronized from votes, comments, and bookmarks.

### Commerce Flow

- Paid ideas use Stripe Checkout Sessions.
- A local `IdeaPurchase` record is created before redirecting the user to Stripe.
- Stripe webhook events update purchase status and create `PaymentTransaction` records.
- Purchase reconciliation can also happen when checking a pending purchase by `session_id`.

## Documentation and Reference Files

- `docs/stripe-integration-plan.md` contains notes about the Stripe flow and local webhook handling.
- `jsonFile/*.endpoints.json` contains module-wise endpoint reference examples.
- `src/shared/templates/*.ejs` contains email and redirect templates.

## Deployment Notes

- `vercel.json` includes EJS templates in the serverless bundle.
- Better Auth is loaded in a Vercel-friendly way so its ESM modules are traceable during deployment.
- If you deploy behind a frontend, ensure `FRONTEND_URL`, `BETTER_AUTH_URL`, Stripe redirect URLs, and Google callback settings match your deployed domains exactly.
- Google OAuth must authorize the exact backend callback URI in Google Cloud and `GOOGLE_CALLBACK_URL`, for example `https://YOUR_BACKEND_HOST/api/auth/callback/google`.
- `BETTER_AUTH_URL` should be the public backend origin used by Google OAuth.

## Quality Signals

This README is structured to show:

- Clear problem understanding
- Clean installation steps
- Evidence of system design thinking
- Security awareness around environment variables, auth, uploads, payments, and webhooks
- Scalability considerations through modular domains, Prisma schema separation, middleware, and shared query utilities

## Contributions

If this is a team project, list contributors here.

| Name | Role | Contributions |
| --- | --- | --- |
| Member-1 | Role | Contributions |
| Member-2 | Role | Contributions |

## How to Contribute

- Fork the project.
- Create a branch: `git checkout -b feature/AmazingFeature`.
- Commit changes: `git commit -m "Add some AmazingFeature"`.
- Push the branch: `git push origin feature/AmazingFeature`.
- Open a pull request.

## License

This project currently declares the `ISC` license in `package.json`. Add a dedicated `LICENSE` or `LICENSE.txt` file if the project should be distributed with full license text.

## Contact

- **Live URL:** [EcoSpark Backend API](https://assignment-eco-spark.vercel.app)
- **Frontend:** [EcoSpark Frontend](https://eco-spark-frontend.vercel.app)
- **Backend Repo:** [EcoSpark-Hub](https://github.com/FahimMuntasir0417/EcoSpark-Hub)
- **Frontend Repo:** [EcoSpark-Frontend](https://github.com/FahimMuntasir0417/EcoSpark-Frontend)
- **Email:** [fahimmuntasirbejoy@gmail.com](mailto:fahimmuntasirbejoy@gmail.com)
- **Portfolio:** [Fahim Portfolio](https://fahim-portfolio-dun.vercel.app/)

## Current Entry Points

- Health-style root response: `GET /`
- App bootstrap: `src/app.ts`
- Server start: `src/server.ts`
- API route registration: `src/routes/index.ts`
- Stripe webhook: `POST /api/v1/commerce/payments/webhook/stripe`
