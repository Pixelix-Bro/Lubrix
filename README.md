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

## Browser and Session Security

Production browser origins must be listed in `CORS_ORIGINS` as a comma-separated allowlist, for example `https://app.example.com`. Do not use `*`. Authentication uses short-lived HttpOnly cookies and rotating server-side refresh sessions; browser JavaScript does not receive JWTs. Same-site deployments can use the default `AUTH_COOKIE_SAME_SITE=lax`. Cross-site frontend/API deployments require HTTPS and `AUTH_COOKIE_SAME_SITE=none` (which also enables Secure cookies). Set `JWT_SECRET` to at least 32 random bytes and use a separate `TELEGRAM_TOKEN_ENCRYPTION_KEY` for Telegram token encryption.

Run the backend regression suite with `npm run test:api`.

## License

To be determined.
