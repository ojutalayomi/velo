# Velo Chat App

A real-time chat application built with Next.js, Socket.IO, and Redux.

## Features

- Real-time messaging (Socket.IO)
- Message reactions, quoting, and link previews
- Group chats
- Message status (sent, delivered, read)
- Dark mode
- Responsive UI

## Tech Stack

- Next.js (App Router)
- Redux Toolkit
- Tailwind CSS
- TypeScript
- MongoDB
- AWS S3 (presigned uploads)
- Web Push (VAPID)
- NextAuth (Google, Facebook)

## Prerequisites

- Node.js 20+
- MongoDB Atlas (or self-hosted)
- AWS account (for S3 uploads)
- Google/Facebook OAuth apps (optional)
- VAPID keys for Web Push

## Environment Variables

Create a `.env.local` in `velo/`:

- Database
  - `MONGOLINK` (MongoDB connection URI)
  - `MONGODB_DATABASE` (Database name)

- Auth and Tokens
  - `JWT_SECRET`
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `FACEBOOK_CLIENT_ID`
  - `FACEBOOK_CLIENT_SECRET`

- Email (Nodemailer via Gmail or your SMTP)
  - `EMAIL_USER`
  - `EMAIL_PASS`

- Web Push
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`

- S3 Upload
  - `AWS_ACCESS_KEY_`
  - `AWS_SECRET_ACCESS_KEY`

- App URLs
  - `NEXT_PUBLIC_BASE_URL` (e.g., https://your-app.com)
  - `NEXT_PUBLIC_SOCKET_URL` (Socket server URL)

Optional (if used by deploy):

- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (for @vercel/kv if configured)

## Scripts

- `npm run dev` — start dev server (with Turbopack)
- `npm run build` — production build
- `npm start` — start production server
- `npm test` — run tests
- `npm run test:coverage` — coverage

## Running Locally

1. Install dependencies:
   - `npm install`
2. Add `.env.local` with variables above
3. Start dev:
   - `npm run dev`
4. Open `http://localhost:3000`

## Push Notifications (Web Push)

- Ensure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set
- Service worker registers at `/sw.js`
- Subscribe/unsubscribe and send test notifications from the home page

## File Uploads (S3 Presigned)

- Endpoint: `POST /api/upload`
  Requires body:
  - `filename`, `contentType`, `bucketName`
- Uses `AWS_ACCESS_KEY_` and `AWS_SECRET_ACCESS_KEY`

## Auth

- NextAuth configured with Google and Facebook providers
- Requires `NEXTAUTH_SECRET`, Google/Facebook client credentials
- JWTs signed with `JWT_SECRET`

## CI: Auto PR from dev -> main

- Workflow: `.github/workflows/auto-pr.yml`
- On push to `dev`: builds, and if successful, creates a PR to `main`
- Required repo secrets:
  - `MONGOLINK`, `MONGODB_DATABASE` (for build-time page data)
  - `PR_CREATOR_TOKEN` (fine‑grained PAT with Pull requests: Read/Write and Contents: Read) to allow PR creation

## Troubleshooting

- Build fails with “Please add your MongoDB URI to .env”:
  - Ensure `MONGOLINK` and `MONGODB_DATABASE` are set locally and as GitHub Action secrets
- PR creation 403 in CI:
  - Add a fine‑grained PAT secret `PR_CREATOR_TOKEN` and ensure the workflow uses it
- Handlebars/webpack warning:
  - Email templates now use inline HTML generation to avoid `require.extensions` warnings

## License

Apache-2.0. See `LICENSE`.
