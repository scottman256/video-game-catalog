# Video Game Catalog — Frontend

Angular 21 single-page app for the video game catalog. Talks to the backend API at the URL configured in `src/environments/environment.ts` (`http://localhost:8000` in development).

## Prerequisites

- Node.js 20+ and npm (Angular CLI 21.2.22 is used via the project's `devDependencies`, no global install required)
- The backend running locally (see `../backend/README.md`) — the app expects it at `http://localhost:8000`

## Setup

```bash
npm install
```

## Running the dev server

```bash
npm start
```

Serves the app at `http://localhost:4200` with live reload. The backend must already be running for login/registration and data to work — CORS is configured on the backend for this origin.

## Running tests

```bash
npm test
```

Runs the unit test suite (Vitest, via Angular's `@angular/build:unit-test` builder) once. There are 60+ specs covering services, guards, the auth interceptor, and every component.

## Building for production

```bash
npm run build
```

Outputs optimized, hashed bundles to `dist/frontend/`. The production build swaps in `src/environments/environment.prod.ts` (which points `apiBaseUrl` at `/api` — adjust this to wherever the backend is actually reachable in your deployment).

## Project layout

- `src/app/core/` — services (`auth`, `game`, `system`, `library`, `review`), the auth guard, the auth cookie/refresh interceptor, and shared models.
- `src/app/shared/components/` — reusable UI: star rating display, screenshot carousel, full-size image modal, password strength meter, field error text.
- `src/app/features/` — one folder per screen: `auth/login`, `auth/register`, `my-games`, `game-detail` (with its nested `review-form`), `search-add-game` (with its nested `add-game-form`).

## Notes

- Authentication is cookie-based (httpOnly access/refresh cookies set by the backend) — there is no token in `localStorage`. The `authInterceptor` attaches `withCredentials` to every request and transparently refreshes the session once on a 401.
- The password strength meter uses `zxcvbn`, which is a sizeable CommonJS dependency; it's lazy-loaded as part of the `register` route chunk so it doesn't affect the initial app bundle.
