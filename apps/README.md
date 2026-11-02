# Lubrix-backend

## Deploy to Vercel

Create a Vercel project with the `api` directory as its Root Directory. In the Vercel project settings, add `MONGODB_URI`, `JWT_SECRET` (at least 32 bytes), and `CORS_ORIGINS` containing the exact frontend origin, for example `https://your-frontend.vercel.app`. For multiple frontends, separate origins with commas; do not include paths or use `*`. You can also set `TELEGRAM_TOKEN_ENCRYPTION_KEY` to a separate persistent secret; otherwise `JWT_SECRET` is used for Telegram token encryption. Add provider-specific variables such as payment or SMS credentials only when those integrations are enabled, then redeploy. The health check is available at `/api/v1/health`.

Vercel Functions do not keep a persistent server process, so Socket.IO connections and background jobs (Telegram runtime and scheduled subscription alerts) are not started by this deployment entrypoint. Run those features on a persistent Node.js host or move them to a dedicated worker.
