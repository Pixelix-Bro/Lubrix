# Lubrix

**Lubrix** is a CRM SaaS platform designed to help automotive service businesses manage customers, vehicles, and oil change services efficiently.

## Overview

Lubrix helps automotive service centers manage customer records, track vehicle service history, monitor oil change intervals, and send automatic reminders when the next service is due.

## Features

- Customer management
- Vehicle registration and management
- Service history tracking
- Oil change interval monitoring
- Automated SMS reminders
- Telegram bot integration
- Service center location discovery
- Multi-branch management
- Business dashboard and analytics
- SaaS subscription management

## Target Audience

- Independent automotive service centers
- Oil change service businesses
- Multi-branch automotive service networks

## Project Goals

- Simplify automotive service management
- Improve customer retention
- Automate oil change reminders
- Help businesses manage multiple service locations
- Build a scalable platform for the global automotive service industry

## Project Status

Currently in development.

## Database Configuration

Set `MONGODB_URI` to the persistent MongoDB deployment used by the API. If that URI is configured but unreachable, the API now stops instead of switching to a different database.

The built-in embedded database is in-memory and loses all data when its process stops. It is disabled by default and must only be enabled for disposable local development with `ALLOW_EPHEMERAL_DB=true`. It is never available in production. For persistent local development, run MongoDB separately and set `MONGODB_URI` to its local connection string.

## Run Frontend and Backend Separately

Install frontend dependencies from the repository root with `npm install`. Install the standalone backend dependencies with `npm install --prefix apps/api`.

Run the backend in one terminal with `npm run dev --prefix apps/api`. Its environment file is `apps/api/.env`; set `MONGODB_URI` for a persistent database, or explicitly set `ALLOW_EPHEMERAL_DB=true` for disposable local data. The API listens on port `5000` by default and allows the local Vite origins on ports `5173` and `5174`.

Run the frontend in another terminal with `npm run dev`. The default API is `http://localhost:5000/api/v1`; set `VITE_API_URL` in the root `.env` when the backend uses another address. `VITE_SOCKET_URL` can optionally override the Socket.IO server origin; otherwise it is derived from `VITE_API_URL`.

For separately hosted production frontend and backend, build the frontend with `VITE_API_URL` set to the backend API base URL, including `/api/v1`. Set `VITE_SOCKET_URL` to the backend origin when it differs from the API URL's origin. Configure the backend `CORS_ORIGINS` with the exact frontend origin. Because authentication uses cookies, cross-site deployments also require HTTPS and `AUTH_COOKIE_SAME_SITE=none`.

## Browser and Session Security

Production browser origins must be listed in `CORS_ORIGINS` as a comma-separated allowlist, for example `https://app.example.com`. Do not use `*`. Authentication uses short-lived HttpOnly cookies and rotating server-side refresh sessions; browser JavaScript does not receive JWTs. Same-site deployments can use the default `AUTH_COOKIE_SAME_SITE=lax`. Cross-site frontend/API deployments require HTTPS and `AUTH_COOKIE_SAME_SITE=none` (which also enables Secure cookies). Set `JWT_SECRET` to at least 32 random bytes and use a separate `TELEGRAM_TOKEN_ENCRYPTION_KEY` for Telegram token encryption.

Run the backend regression suite with `npm run test:api`.

## License

To be determined.
