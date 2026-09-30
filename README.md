# union-landing-backend (Node.js)

Node.js/Express port of the `union-landing-backend` Spring Boot service. Preserves every
existing endpoint, request/response shape, status code, JWT structure, and MySQL table/column
name so the React frontend and existing database can be pointed at this service with no changes.

## ⚠️ Scope note - read this first

The migration brief this was built from described a much larger platform (ATS, chat,
WebSockets, file uploads, JOBSEEKER/MANAGER dashboards, etc.). **The actual Spring Boot source
provided does not contain any of that.** The real project is a small landing-page backend with
two feature areas:

1. **Auth** - signup, login, refresh token, forgot-password → email OTP → verify OTP → reset
   password. Roles: `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`.
2. **Leads** - one public "request a demo" capture endpoint.

This port implements exactly that, faithfully, rather than inventing the extra features
mentioned in the brief. See "Functionality not present in source" below.

## Tech stack

Express · Sequelize (MySQL) · jsonwebtoken · bcryptjs · nodemailer · express-validator ·
helmet · cors · express-rate-limit · dotenv

Sequelize was chosen over Prisma because `underscored: true` maps camelCase model fields to
snake_case columns automatically, which is a one-line equivalent of Hibernate's default naming
strategy the Java app relies on (`firstName` → `first_name`, etc.) - no code-gen step needed.

## Project structure

```
backend/
├── src/
│   ├── config/        # db.js (Sequelize connection), cors.js
│   ├── controllers/    # thin HTTP layer - parse req, call service, shape response
│   ├── services/       # business logic (auth, otp, email, demoRequest)
│   ├── routes/         # Express routers, one per Spring @RequestMapping
│   ├── models/         # Sequelize models = JPA entities
│   ├── middleware/      # authenticate, requireAuth/requireRole, errorHandler, notFound
│   ├── validators/     # express-validator rules = jakarta.validation annotations
│   ├── utils/          # jwt.js, ApiError.js, asyncHandler.js, toUserResponse.js, seed.js
│   └── app.js           # Express app: middleware pipeline + route mounting
├── .env.example
├── server.js            # entry point: DB connect/sync, dev seeding, listen
└── package.json
```

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env - point DB_* at your existing MySQL instance (same DB the Spring Boot app used)
npm run dev      # nodemon, or:
npm start        # node server.js
```

The server calls `sequelize.sync({ alter: true })` in development (equivalent of
`ddl-auto: update`) and a validate-only `sequelize.sync()` in production (equivalent of
`ddl-auto: validate` - it will NOT alter your production schema). Point it at the existing
database; table/column names already match, so `sync()` should be a no-op against real data.

Set `SEED_DEV_ADMIN=true` (development only) to auto-create `admin@union.dev` / `Admin@123` on
first boot, matching `DevDataSeeder.java`. Never enable in production.

## API endpoints (unchanged from Spring Boot)

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/signup` | Public | `firstName, lastName?, email, password, confirmPassword, department?` | Always creates role `EMPLOYEE`. Returns `201` + tokens. |
| POST | `/api/v1/auth/login` | Public | `email, password` | Returns `200` + tokens. |
| POST | `/api/v1/auth/refresh-token` | Public | `refreshToken` | Exchanges a REFRESH token for a new pair. |
| POST | `/api/v1/auth/forgot-password` | Public | `email` | Always `200`, same message whether or not the account exists (no account-enumeration leak). |
| POST | `/api/v1/auth/verify-otp` | Public | `email, otp` (6 digits) | Returns a short-lived `resetToken` on success. |
| POST | `/api/v1/auth/reset-password` | Public | `resetToken, newPassword, confirmPassword` | Requires a verified OTP for the same email. |
| POST | `/api/v1/leads/demo-request` | Public | `name, workEmail, company, companySize?, message?` | Returns `201` + `{id, status, receivedAt}`. |
| * | `/api/v1/admin/**` | `ADMIN` role | - | Reserved by `SecurityConfig.java`; no controller exists in the Java source either, so this still 404s. Middleware (`requireAuth` + `requireRole('ADMIN')`) is wired and ready for when real admin routes are added. |

All other `/api/**` routes require a valid `Authorization: Bearer <ACCESS token>` header
(`anyRequest().authenticated()` in `SecurityConfig.java`) - there currently are none besides the
above.

### Response shapes
- Success/auth responses match the Java DTOs exactly: `LoginResponse {token, refreshToken, user}`,
  `UserResponse {id, name, email, role, department, profileImage}`, `MessageResponse {success, message}`,
  `OtpVerifiedResponse {success, message, resetToken}`.
- Errors match `GlobalExceptionHandler.java`: `{timestamp, status, error}`, with a `fields` map added for
  validation errors (`400`).

### Password / OTP rules (unchanged)
- Password policy: min 8 chars, upper+lower+digit+special char (same regex as the Java `@Pattern`).
- OTP: 6 digits, 5-minute expiry, 5 max attempts, 60s resend cooldown (all env-configurable, same
  defaults as `application.yml`).
- Access token: 15 min. Refresh token: 7 days. Reset token: fixed 5 min. Same as `JwtProperties`.

## Migration mapping

| Spring Boot | Node.js |
|---|---|
| `AuthController` | `routes/auth.routes.js` + `controllers/auth.controller.js` |
| `DemoRequestController` | `routes/demoRequest.routes.js` + `controllers/demoRequest.controller.js` |
| `AuthService` | `services/auth.service.js` |
| `OtpService` | `services/otp.service.js` |
| `EmailService` | `services/email.service.js` (nodemailer) |
| `DemoRequestService` | `services/demoRequest.service.js` |
| `User`, `PasswordResetOtp`, `DemoRequest` (JPA entities) | `models/*.model.js` (Sequelize) |
| `UserRepository`, `PasswordResetOtpRepository`, `DemoRequestRepository` | Sequelize model query methods (`findOne`, `create`, `destroy`, ...) - no separate repository layer needed |
| `JwtUtil` | `utils/jwt.js` |
| `JwtAuthenticationFilter` | `middleware/authenticate.js` |
| `SecurityConfig` (`authorizeHttpRequests`) | `middleware/requireAuth.js` (`requireAuth`, `requireRole`), applied per-route |
| `CustomUserDetailsService` / `UserPrincipal` | Not needed - `authenticate.js` loads the `User` row directly and attaches it to `req.user` |
| `AuthenticationEntryPointImpl` | 401 JSON body in `middleware/requireAuth.js` |
| `CorsConfig` | `config/cors.js` |
| `GlobalExceptionHandler` | `middleware/errorHandler.js` |
| `auth/exception/*.java` (typed exceptions) | `utils/ApiError.js` (status-carrying error + factory methods per case) |
| jakarta `@Valid` / DTO annotations | `express-validator` rules in `validators/*.js` |
| `DevDataSeeder` | `utils/seed.js`, invoked from `server.js` when `SEED_DEV_ADMIN=true` |
| `application.yml` | `.env` / `.env.example` |

## Functionality not present in source (and therefore not migrated)

The Java project has **no** code for: WebSocket/STOMP, chat, ATS scoring/shortlisting, file
upload/download, or a MANAGER/JOBSEEKER-specific dashboard flow. None of this exists to migrate.
If your actual production backend has these (e.g. on a different branch or module not included
in the uploaded workspace), send that source and they can be ported using the same
controller → route, service → service, entity → model pattern used here.

## Testing performed

Verified end-to-end against a live MySQL-compatible database in this sandbox (schema created
via `sequelize.sync`, matching table/column names confirmed with `DESCRIBE`):

- `POST /signup` → 201 with tokens; duplicate email → 409; invalid input → 400 with field errors
- `POST /login` → 200 with tokens; wrong password → 401
- `POST /refresh-token` → 200 with new token pair; garbage token → 401
- `POST /forgot-password` → 200 for both known and unknown emails (no enumeration leak)
- `POST /verify-otp` → wrong code rejected; correct code returns a `resetToken`
- `POST /reset-password` → mismatched confirmation rejected; success invalidates the old
  password and the new password logs in immediately after
- `POST /leads/demo-request` → 201 with `{id, status, receivedAt}`; invalid email → 400
- Unmatched route → 404 with consistent error body
- Dev admin seeding confirmed present in `users` table after boot

## Production deployment notes

- Set `NODE_ENV=production`, a strong unique `JWT_SECRET`, real `DB_*`/`MAIL_*` credentials, and
  `CORS_ORIGINS` to your real frontend origin(s) - never rely on the `.env.example` defaults.
- `SEED_DEV_ADMIN` should be unset/`false` in production.
- Run behind a process manager (pm2/systemd) or containerize; put it behind a reverse proxy
  (nginx/ALB) that terminates TLS.
- `sequelize.sync()` in production only validates - it does not create or alter tables. Use a
  proper migration tool (e.g. `sequelize-cli` migrations, or Umzug) for schema changes going
  forward, the same way you'd use Flyway/Liquibase alongside Hibernate `ddl-auto: validate`.

## Frontend changes required

None, provided the frontend already calls `/api/v1/auth/*` and `/api/v1/leads/demo-request` and
sends `Authorization: Bearer <token>` the same way. Just point its API base URL at this server's
`PORT` (default `8080`, same as the Spring Boot app) instead of the old one.
