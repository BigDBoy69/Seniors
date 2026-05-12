# Akwaluzto — Luxury Fashion E-Commerce Platform

Akwaluzto is a full-stack e-commerce platform for a Lebanese luxury fashion brand. It sells women's and men's clothing and accessories, operates on a Cash-on-Delivery payment model (with optional PayMob card integration), and is built with a strong focus on security, personalization, and customer experience.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, React Router v6, Zustand |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL via Prisma ORM |
| **AI / Chat** | OpenAI GPT-4o-mini |
| **Email** | Resend |
| **Payments** | PayMob (Cash on Delivery + card checkout) |
| **Deployment** | Render (backend), Vercel (frontend) |

---

## Architecture Overview

```
┌──────────────────────────────┐        ┌──────────────────────────────────────────┐
│  Frontend (Vercel)           │  HTTPS │  Backend API (Render)                    │
│  React + Vite + Zustand      │◄──────►│  Express 5 + Prisma + PostgreSQL         │
│                              │        │                                          │
│  /src                        │        │  /src                                    │
│   pages/          (30+)      │        │   controllers/   (9 domains)             │
│   components/ui/  (shared)   │        │   services/      (auth, email, AI, rec.) │
│   hooks/          (auth,cart)│        │   middleware/    (security, auth, errors) │
│   store/          (Zustand)  │        │   routes/        (REST API)              │
│   lib/api.ts      (typed)    │        │   lib/           (prisma, cache, logger) │
└──────────────────────────────┘        └──────────────────────────────────────────┘
```

All API calls from the frontend go through `frontend/src/lib/api.ts` (authenticated routes) or `frontend/src/lib/transport.ts` (unauthenticated), which prepend the base URL and handle errors uniformly.

---

## Features

- **Product Catalog** — categories, variants (size, color), image gallery, stock tracking
- **Search & Filters** — full-text search, category, price range, color, size filters
- **Shopping Cart** — Zustand-persisted, server-synced on login
- **Wishlist** — per-user, synced across sessions
- **Checkout** — address, delivery slot, Cash on Delivery or PayMob card
- **Orders** — full lifecycle (PENDING → PROCESSING → SHIPPED → DELIVERED), order history
- **Payments** — PayMob unified checkout with HMAC-verified webhooks
- **AI Customer Support Chatbot** — GPT-4o-mini, order lookup, user context
- **Personalized Recommendations** — hybrid ML engine (content + collaborative + fashion)
- **User Auth** — JWT-based, email verification, password reset, email-confirmed account deletion
- **Admin Panel** — order management, product CRUD, user management, analytics
- **Newsletter** — subscribe/unsubscribe with token-based one-click unsubscribe
- **CMS** — site settings, banners, promotional content
- **404 / Error pages** — branded, with redirect to home

---

## Database Models (Summary)

The schema has 30+ models. Key ones:

| Model | Purpose |
|---|---|
| `User` | Customers — email, hashed password, verification token, deletion token |
| `Admin` | Back-office users — separate auth, role-based |
| `Product` | Catalog — images, variants, categories, status |
| `ProductVariant` | Size/color combinations, stock per variant |
| `ProductFeature` | ML feature vectors (20-dim), trending score, style tags |
| `Order` | Order lifecycle, line items, pricing breakdown |
| `Payment` | PayMob payment intent, transaction ID, status |
| `UserEvent` | Behavioral tracking — views, clicks, purchases, adds to cart |
| `UserPreference` | Computed user taste profile (preference vector, affinities) |
| `RecommendationCache` | Scaffolded for future caching of computed recommendations |
| `SiteSettings` | CMS — contact info, policies, delivery info |
| `Newsletter` | Subscriptions with unsubscribe token |

---

## Security Implementation

### 1. Authentication — JWT (JSON Web Tokens)

**Algorithm:** HS256 (HMAC-SHA256)  
**Secret:** Required ≥32 chars; weak/placeholder values rejected at startup with an explicit error and list of known bad patterns (`your-super-secret`, `changeme`, `jwt-secret`, etc.)  
**Expiry:** Configurable via `JWT_EXPIRES_IN` env var (default `7d`)  
**Payload:** `{ userId, email, role, iat }`

**Token invalidation** — changing a password or deleting an account sets `passwordChangedAt` on the User row to `now()`. Every authenticated request checks:

```
token.iat < user.passwordChangedAt  →  reject with 401
```

This means all previously issued tokens are instantly invalidated after a password change or account deletion, with no token blocklist needed.

**Admin auth** is a separate middleware (`middleware/auth.ts`) using a separate JWT payload (`adminId`, `email`, `role`). On every admin request, after JWT verification, the middleware performs a database lookup to confirm the Admin record still exists and `active = true` — so deactivating an admin account takes effect immediately, even for tokens that haven't expired.

---

### 2. Password Security

**Hashing:** `bcryptjs` with cost factor 12 (≈250ms on modern hardware — slow enough to deter brute force, fast enough for UX)

**Strength validation** applied on registration and password change:
- Minimum 8 characters
- Maximum 128 characters
- Must contain: uppercase letter, lowercase letter, digit, special character

**Brute-force lockout (two-layer):**

| Layer | Trigger | Duration |
|---|---|---|
| Per-IP + email | 5 failed logins | 30 minutes |
| Global per-account | 10 failed logins (all IPs) | 30 minutes |

The global layer prevents attackers from cycling IPs to bypass the per-IP limit.

> Note: Both lockout maps are in-memory and reset on server restart. For multi-instance deployments, migrate to Redis.

---

### 3. Rate Limiting

All rate limiters use `express-rate-limit`, keyed by IP. Skip logic bypasses limits for `127.0.0.1` / `::1` in development.

| Endpoint | Window | Limit | Notes |
|---|---|---|---|
| `POST /api/auth/login` | 15 min | 10 | Auth attempts |
| `POST /api/auth/signup` | 15 min | 5 | Registration |
| `POST /api/auth/forgot-password` | 1 hour | 3 | Password reset request |
| `POST /api/auth/resend-verification` | 1 hour | 3 | Email verification |
| `POST /api/auth/request-deletion` | 1 hour | 2 | Account deletion request |
| `POST /api/chat` | 15 min | 20 | AI chat messages |
| `POST /api/newsletter/subscribe` | 1 hour | 5 | Newsletter |
| `GET /api/recommendations/*` | 15 min | 120 | Recommendation scraping prevention |
| Global | 15 min | 100 | All other endpoints |

Slow-down middleware additionally introduces progressive delays after the 50th request per 15 minutes on the global tier.

---

### 4. CORS

```ts
allowedOrigins = [
  'http://localhost:5173',   // dev
  process.env.FRONTEND_URL, // production Vercel URL
]
```

`Origin` header is checked against the allowlist. Requests from unlisted origins receive `Access-Control-Allow-Origin: false`, blocking credential access from third-party sites.

---

### 5. HTTP Security Headers (Helmet)

Applied via `helmet` on all responses, including uploaded static files:

| Header | Value / Effect |
|---|---|
| `Content-Security-Policy` | Restricts scripts/styles/images to self + CDN allowlist |
| `Strict-Transport-Security` | HSTS with `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` — prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` — prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Powered-By` | Removed — hides Express version |

Static file middleware is mounted **after** `applySecurityMiddleware()` so all Helmet headers apply to `/uploads/` responses as well.

---

### 6. Input Validation (Zod)

Every controller entry point parses request body/query with a Zod schema. Invalid input short-circuits to a `400 Validation failed` response with per-field error details, before any database interaction occurs. The `errorHandler` middleware specifically catches `ZodError` instances:

```ts
if (err instanceof ZodError) {
  return res.status(400).json({
    error: 'Validation failed',
    details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
  });
}
```

---

### 7. File Upload Security

The upload endpoint (`POST /api/upload`) performs two validation passes:

1. **MIME type check** — multer rejects files whose `mimetype` header is not `image/jpeg`, `image/png`, or `image/webp`
2. **Magic-byte check** — after saving to disk, the first 12 bytes are read and checked against known binary signatures:
   - JPEG: `FF D8 FF`
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - WebP: `52 49 46 46 __ __ __ __ 57 45 42 50`
   
   Files that fail this check are deleted from disk immediately and the request is rejected with `400`.

This two-pass approach prevents MIME-type spoofing attacks (e.g. renaming a PHP file as `.jpg`).

**Size limits:** Max 5 MB per file, max 10 files per upload request.  
**Filename:** Replaced with `nanoid()` — no user-controlled characters in the path.

---

### 8. PayMob Webhook HMAC Verification

PayMob signs all transaction callbacks with an HMAC-SHA512 digest over a specific set of fields in lexicographic key order:

```
HMAC = SHA512(concat(
  amount_cents, created_at, currency, error_occured, has_parent_transaction,
  id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded,
  is_standalone_payment, is_voided, order.id, owner, pending,
  source_data.pan, source_data.sub_type, source_data.type, success
), PAYMOB_HMAC_SECRET)
```

The comparison uses `crypto.timingSafeEqual()` to prevent timing side-channel attacks — the comparison takes the same amount of time regardless of how many characters match.

**Idempotency:** Each transaction ID is recorded in a `PaymentEvent` table. Duplicate webhook deliveries are detected and skipped without re-processing the order.

---

### 9. Email-Confirmed Account Deletion

Three-step secure flow:

1. **Request** (`POST /api/auth/request-deletion`, requires Bearer token):
   - Generates 64-hex-char cryptographically random token (`crypto.randomBytes(32)`)
   - Stores token + 1-hour expiry on the User row (`deleteAccountToken`, `deleteAccountTokenExpiry`)
   - Sends branded email with confirmation link to `{FRONTEND_URL}/confirm-delete?token=xxx`
   - Rate-limited: 2 requests/hour/IP

2. **Confirm** (`GET /api/auth/confirm-deletion?token=xxx`, no auth required — token is the proof):
   - Looks up User by `deleteAccountToken` (unique index — prevents brute force across users)
   - Checks expiry server-side
   - **Soft delete:** sets `active = false`, obfuscates email to `deleted_{timestamp}_{original}`, updates `passwordChangedAt = now()` (instantly invalidates all existing JWTs), clears token fields

3. **Frontend** (`/confirm-delete`):
   - On load, calls confirm endpoint with token from URL
   - On success: logs user out, redirects home after 3s
   - On error: shows "link invalid or expired" with link back to account settings

---

### 10. Password Reset

Same token pattern as account deletion:
- 64-hex-char random token, 1-hour expiry
- Stored on User row (`passwordResetToken`, `passwordResetTokenExpiry`)
- Token is cleared after first use (single-use enforcement)
- `passwordChangedAt` updated on completion → all prior JWTs invalidated

---

### 11. Email Verification

- 64-hex-char token, 24-hour expiry
- Verified status prevents login to unverified accounts (configurable)
- `resendVerificationEmail` returns the same generic message whether the email is verified, unverified, or unregistered — prevents enumeration

---

### 12. SQL Injection Prevention

All database access goes through the Prisma ORM with parameterized queries. No raw SQL is used anywhere in the codebase. Prisma's query builder constructs prepared statements internally, making string-interpolation injection structurally impossible.

Additionally, `express-mongo-sanitize` strips `$` and `.` characters from request bodies and query strings as a defense-in-depth measure against NoSQL injection patterns.

---

### 13. Error Handling

In production, the `errorHandler` middleware:
- Logs full error details (path, method, stack) to `securityLogger` (Winston, structured JSON)
- Returns only sanitized messages to the client — errors containing Prisma model names, SQL keywords, file paths, or stack traces return generic messages (`"A database error occurred"`, `"Internal server error"`)
- 4xx errors return the original message only if it passes the sanitization filter

In development, the full error message is returned to ease debugging.

---

### 14. Security Logging

All security-relevant events are logged via a Winston logger writing structured JSON to `logs/combined.log` and `logs/error.log`:

- Auth attempts (success/failure/lockout) with masked identifiers
- Password reset and email verification flows
- Account creation and deletion
- Admin actions
- PayMob webhook events (HMAC failures, duplicate transactions, payment outcomes)
- Rate limit violations
- File upload rejections
- Unhandled errors

Identifiers (emails, user IDs) are masked in logs using a salted HMAC-SHA256 hash — full values are never written to disk.

---

## AI Customer Support Chatbot

### Overview

A floating chat widget powered by OpenAI GPT-4o-mini. It provides customer support, answers FAQs, looks up order status, and personalizes responses for logged-in users.

### Model Configuration

| Parameter | Value |
|---|---|
| Model | `gpt-4o-mini` |
| Max tokens | `300` |
| Temperature | `0.5` (balanced: consistent but not robotic) |
| History limit | 20 messages, 2000 chars each |
| Input limit | 1000 chars per message |

### System Prompt Architecture

The system prompt is built dynamically per request from four layers:

1. **Brand persona** — hardcoded: tone guidance ("warm, professional, concise"), rules (never reveal internal details, never discuss competitors, cap reply at 120 words unless necessary)

2. **DB policies** — loaded from `SiteSettings` in the database: delivery info, shipping info, returns policy, contact email/phone

3. **Static FAQ block** — hardcoded: payment method, order tracking, sizing, materials, care instructions, free shipping thresholds, refund timeline

4. **User context** — if the request has a valid Bearer token:
   - User's first/last name and email
   - Last 5 orders with status, total, and item breakdown (name, size, quantity)

### Order Lookup

When a message contains an order number matching `AKW-[A-Z0-9]+-[A-Z0-9]+` (case-insensitive):

1. The order is fetched from the database (status, payment status, total, items, phone, userId)
2. Identity is verified:
   - **Authenticated owner:** `userId` from JWT matches `order.userId` → full details shared with GPT
   - **Phone verification:** Phone number from the order appears in the message → full details shared (guest verification flow)
   - **Neither:** GPT is told the order exists but identity could not be verified, and is instructed to ask for the phone number
3. This prevents unauthenticated users from looking up other people's orders by guessing order numbers

### Security

- Rate limited: 20 messages / 15 minutes / IP
- Auth is optional — invalid tokens silently degrade to guest mode (no 401 errors mid-conversation)
- System prompt explicitly forbids revealing internal IDs, database fields, or system details
- `OPENAI_API_KEY` absence triggers a clean `503` rather than a crash

### Frontend Widget (`ChatWidget.tsx`)

- Floating button (bottom-right), opens an overlay chat panel
- Dark luxury aesthetic matching brand identity
- Quick-reply suggestion chips for common questions (track order, returns policy, sizing, contact)
- Typing indicator during API call
- Sends full conversation history on each message for context continuity
- Auth token passed automatically if user is logged in

---

## Recommendation System

### Architecture

The recommendation system is a custom hybrid engine with four sub-components that are linearly fused:

```
Final Score = w₁·ContentScore + w₂·CollaborativeScore + w₃·FashionScore + w₄·PopularityScore
```

Weights vary by recommendation type:

| Type | Content | Behavior | Fashion | Popularity |
|---|---|---|---|---|
| `SIMILAR` | 0.60 | 0.20 | 0.10 | 0.10 |
| `PERSONALIZED` | 0.35 | 0.40 | 0.15 | 0.10 |
| `COMPLEMENTARY` | 0.30 | 0.20 | 0.35 | 0.15 |
| `TRENDING` | 0.20 | 0.10 | 0.10 | 0.60 |

### Content-Based Filtering

Each product has a **20-dimensional feature vector** stored in `ProductFeature.featureVector`. The vector encodes:
- Category embedding
- Price range (normalized)
- Style tags (e.g. `casual`, `formal`, `streetwear`)
- Seasonality
- Fabric/material type

Similarity between two products is computed using **cosine similarity**:

```
similarity(A, B) = (A · B) / (|A| × |B|)
```

A similarity > 0.8 is labeled "Very similar to what you are viewing"; lower scores get "Similar style".

### Collaborative Filtering (Behavior Engine)

User behavior is tracked via `UserEvent` records with typed event weights:

| Event | Weight |
|---|---|
| `PURCHASE` | 5.0 |
| `ADD_TO_CART` | 3.0 |
| `ADD_TO_WISHLIST` | 2.5 |
| `PRODUCT_VIEW` | 1.0 |
| `CLICK` | 0.5 |
| `IMPRESSION` | 0.1 |

**User profile construction** (last 90 days of events):
- Events are weighted by type and by recency (exponential time decay: more recent = higher weight)
- Affinities are computed for: category, style tags, color, price bracket
- A preference vector is derived as the weighted average of feature vectors of interacted products

**User-user collaborative filtering:** For a target user, find other users with similar preference vectors (cosine similarity on preference vectors), then surface products they liked that the target user hasn't seen.

**Item-item collaborative filtering:** For a viewed/selected product, find other products that appear frequently in the same users' interaction histories.

### Fashion-Aware Scoring (Complete the Look)

The "Complete the Look" feature uses outfit composition rules defined in `OUTFIT_POSITION_RULES`:

- Each category (e.g. `tops`) has a list of complementary categories (e.g. `bottoms`, `shoes`, `bags`)
- Compatibility is boosted by **color harmony** (using color theory: complementary, analogous, monochromatic color relationships on the HSL wheel)
- Style tag overlap also boosts score
- Results are deduplicated by complementary category so the response has at most one item per outfit slot

### Cold-Start Strategy

New users without behavior history are handled with a tiered strategy:

| Strategy | Trigger | Behavior |
|---|---|---|
| `NEW_USER` | No events | Trending products + editorial picks |
| `WARM_USER` | Session activity only | Session-based (views in current session) |
| `ACTIVE_USER` | 90-day history | Full hybrid engine |

### Endpoints

| Method + Path | Description |
|---|---|
| `GET /api/recommendations/similar/:productId` | Content + collaborative similar products |
| `GET /api/recommendations/complete-the-look/:productId` | Fashion outfit completion |
| `GET /api/recommendations/personalized` | Homepage personalized feed (auth required) |
| `GET /api/recommendations/trending` | Site-wide trending products |
| `GET /api/recommendations/new-arrivals` | Recent additions |
| `POST /api/recommendations/track` | Log a user event (view, click, etc.) |
| `GET /api/recommendations/analytics/metrics` | ADMIN only — recommendation performance |
| `POST /api/recommendations/system/update-profiles` | ADMIN only — rebuild user preference vectors |

### Frontend Usage

Recommendation widgets appear on:
- **Home page** — personalized feed (logged-in) or trending (guest)
- **Product page** — "Similar Products" + "Complete the Look" (two separate widgets)
- **`/recommendations` page** — full personalization hub with multiple sections

---

## Deployment

### Frontend (Vercel)

- `frontend/vercel.json` configures a catch-all rewrite to `index.html` for SPA routing
- Set `VITE_API_URL` to the Render backend URL in Vercel environment settings

### Backend (Render)

- `render.yaml` defines the web service with all required environment variables
- Build command: `npm run build` (runs `prisma generate && tsc`)
- Start command: `node dist/index.js`
- Uploads are stored in `public/uploads/` — this path is ephemeral on Render's free plan; migrate to S3 or Cloudinary for persistence

### Required Environment Variables

See `backend/.env.example` for the full list with documentation. Critical vars:
- `JWT_SECRET` — must be ≥32 chars, cryptographically random
- `DATABASE_URL` — PostgreSQL connection string
- `RESEND_API_KEY` — email delivery
- `OPENAI_API_KEY` — AI chatbot
- `FRONTEND_URL` — used in CORS allowlist and email links
- `PAYMOB_*` — payment processing keys

---

## Development

```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install

# Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Push schema to database
cd backend && npx prisma db push

# Start development servers
cd backend && npm run dev
cd frontend && npm run dev
```

### Tests

```bash
cd backend && npm test
# 28 tests across: auth flows, password reset, order access control, token invalidation, order price validation
```
