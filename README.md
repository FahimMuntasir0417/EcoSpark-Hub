# EcoSpark Backend API

EcoSpark is a TypeScript and Express backend for an eco-innovation platform where members and scientists can publish sustainability ideas, organize campaigns, collaborate through comments and experience reports, and sell premium ideas through Stripe Checkout.

This repository contains the backend only. The API is organized by domain modules, uses Prisma with PostgreSQL, stores uploaded assets in Cloudinary, sends transactional emails with Nodemailer and EJS templates, and supports both Better Auth sessions and custom JWT access tokens.

## Live URLs

- API: Not provided
- Frontend: Not provided
- Admin: Not provided

## Overview

The platform currently supports:

- Member registration, login, email verification, password reset, refresh token flow, and Google OAuth
- Role-based accounts for `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `SCIENTIST`, and `MEMBER`
- Member-to-scientist promotion, specialty assignment, and scientist verification
- Idea creation, review, approval, rejection, publishing, featuring, highlighting, media uploads, and attachments
- Engagement features including votes, comments, threaded replies, and bookmarks
- Campaign management for grouping and promoting ideas
- Paid idea access with Stripe Checkout, webhook-based payment confirmation, purchase history, and transaction tracking
- Community features such as experience reports, notifications, and newsletter subscriptions
- Dashboard analytics for member, scientist, and admin personas
- Search, filtering, sorting, and pagination across most resource collections

## Tech Stack

- Runtime: Node.js, Express 5, TypeScript
- Database: PostgreSQL with Prisma ORM and `@prisma/adapter-pg`
- Authentication: Better Auth, JWT, cookies, Google OAuth
- Validation: Zod
- File uploads: Multer + Cloudinary
- Email: Nodemailer + EJS templates
- Payments: Stripe Checkout + webhooks
- Tooling: pnpm, ESLint, Prettier, ts-node-dev
- Deployment support: Vercel configuration included

## Architecture Highlights

- Modular service architecture: each domain lives under `src/modules/<ModuleName>` with controller, service, route, interface, validation, and optional constants files.
- Modular Prisma schema: database models are split across `prisma/schema/*.prisma` instead of one large schema file.
- Shared query pipeline: `src/builder/queryBuilder.ts` standardizes `page`, `limit`, `sortBy`, `sortOrder`, `searchTerm`, and filter handling.
- Standard API responses: handlers use a consistent `{ success, message, meta, data }` response envelope.
- Centralized error handling: Zod, Prisma, Multer, and application errors are normalized in one place, and failed upload requests attempt Cloudinary rollback.
- Hybrid auth model: Better Auth manages sessions while the app also issues JWT access and refresh tokens for API authorization.
- Raw Stripe webhook handling: the webhook route is mounted before JSON parsing so Stripe signature verification works correctly.

## Main Domain Model

- Identity: `User`, `Session`, `Account`, `Verification`, `Admin`, `Member`, `Scientist`
- Discovery and content: `Category`, `Tag`, `Specialty`, `ScientistSpecialty`, `Campaign`, `Idea`, `IdeaAttachment`, `IdeaMedia`
- Engagement: `Vote`, `Comment`, `IdeaBookmark`
- Moderation: `IdeaStatusLog`, `IdeaReviewFeedback`, `IdeaReport`, `CommentReport`, `ModerationAction`
- Commerce: `IdeaPurchase`, `PaymentTransaction`
- Community: `ExperienceReport`, `Notification`, `NewsletterSubscription`

## API Surface

Base URL in local development:

```bash
http://localhost:5000
```

Versioned application routes live under:

```bash
/api/v1
```

Better Auth runtime routes are mounted separately under:

```bash
/api/auth
```

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

- Most feature modules mount `checkAuth()` at router level, so application routes are primarily authenticated routes.
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

Maximum upload size: `10 MB`

## Getting Started

### Prerequisites

Before running the project, make sure you have:

- PostgreSQL database access
- `pnpm`
- Cloudinary credentials
- SMTP credentials for email delivery
- Google OAuth client credentials
- Stripe API keys and webhook secret

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env` file in the project root and provide values for the following variables.

#### Core

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=
```

#### Auth and Tokens

```env
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRES_IN=
REFRESH_TOKEN_EXPIRES_IN=
BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN=
BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE=
```

#### Email

```env
EMAIL_SENDER_SMTP_USER=
EMAIL_SENDER_SMTP_PASS=
EMAIL_SENDER_SMTP_HOST=
EMAIL_SENDER_SMTP_PORT=
EMAIL_SENDER_SMTP_FROM=
```

#### Google OAuth

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

#### Frontend and Redirect URLs

```env
FRONTEND_URL=
```

#### Stripe

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=
```

#### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

#### Optional Seed Variables

These are used by `pnpm seed:admin`.

```env
SEED_DATABASE_URL=
SEED_ADMIN_NAME=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_ROLE=
SEED_ADMIN_CONTACT_NUMBER=
SEED_ADMIN_PROFILE_IMAGE=
```

### Database Setup

Generate the Prisma client and apply your database migrations:

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

### Seed an Admin User

```bash
pnpm seed:admin
```

### Run the Development Server

```bash
pnpm dev
```

The server starts on the port defined by `PORT`, defaulting to `5000`.

### Production Build

```bash
pnpm build
pnpm start
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

## Project Structure

```text
.
|-- docs/
|-- jsonFile/
|-- prisma/
|   |-- migrations/
|   `-- schema/
|-- src/
|   |-- app.ts
|   |-- server.ts
|   |-- builder/
|   |-- config/
|   |-- errors/
|   |-- interfaces/
|   |-- lib/
|   |-- middlewares/
|   |-- modules/
|   |-- routes/
|   |-- scripts/
|   |-- shared/
|   `-- utils/
|-- vercel.json
`-- package.json
```

## Notable Workflows

### Authentication Flow

- Custom auth endpoints live under `/api/v1/auth`
- Better Auth runtime endpoints live under `/api/auth`
- Registration creates a member profile automatically
- Login returns JWT access and refresh tokens and also works with Better Auth session cookies
- Email verification and password reset are OTP-based and use EJS email templates

### Scientist Lifecycle

- A member can be promoted to a scientist profile
- Scientists can be linked to one or more specialties
- Verification stores both `verifiedAt` and `verifiedById`
- Deleting a scientist record demotes the user back to `MEMBER`

### Idea Lifecycle

- Ideas are created as `DRAFT`
- They can move through `UNDER_REVIEW`, `APPROVED`, `REJECTED`, and `ARCHIVED`
- Publishing, featuring, and highlighting are separate actions
- Tags, attachments, and media can be managed after creation
- Engagement counters are synchronized from votes, comments, and bookmarks

### Commerce Flow

- Paid ideas use Stripe Checkout Sessions
- A local `IdeaPurchase` record is created before redirecting the user to Stripe
- Stripe webhook events update purchase status and create `PaymentTransaction` records
- Purchase reconciliation can also happen when checking a pending purchase by `session_id`

## Documentation and Reference Files

- `docs/stripe-integration-plan.md` contains notes about the Stripe flow and local webhook handling
- `jsonFile/*.endpoints.json` contains module-wise endpoint reference examples
- `src/shared/templates/*.ejs` contains email and redirect templates

## Deployment Notes

- `vercel.json` includes EJS templates in the serverless bundle
- Better Auth is loaded in a Vercel-friendly way so its ESM modules are traceable during deployment
- If you deploy behind a frontend, ensure `FRONTEND_URL`, `BETTER_AUTH_URL`, Stripe redirect URLs, and Google callback settings match your deployed domains exactly

## Current Entry Points

- Health-style root response: `GET /`
- App bootstrap: `src/app.ts`
- Server start: `src/server.ts`
- API route registration: `src/routes/index.ts`
- Stripe webhook: `POST /api/v1/commerce/payments/webhook/stripe`
