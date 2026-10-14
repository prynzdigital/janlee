# JanLee CRM — setup & operations

The CRM lives at **`/admin/`** (e.g. `https://interiorsbyjanlee.com/admin/`).
It runs on Vercel with a **Neon Postgres** database and **Vercel Blob** for files.
Opened locally without the API (e.g. `python -m http.server`), it runs in **demo mode** with sample data.

## How it fits together

| Piece | Where | Purpose |
|---|---|---|
| `site/admin/` | static | the dashboard (no third-party scripts) |
| `api/auth.js` | Vercel function | sign in / out, change password, profile |
| `api/data.js` | Vercel function | read & write leads, clients, projects, tasks, history |
| `api/files.js` | Vercel function | upload / view / delete files (Vercel Blob, private) |
| `api/lead.js` | Vercel function | saves website contact-form enquiries as **New** leads |
| `db/schema.sql` | Neon | tables (already applied) |

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Set by | Notes |
|---|---|---|
| `DATABASE_URL` | Neon integration (automatic) | secret |
| `BLOB_READ_WRITE_TOKEN` **or** `BLOB_STORE_ID` | Blob store connection (automatic) | older stores add the token; newer ones add the store ID and sign in with Vercel OIDC — either works |
| `ADMIN_PASSWORD` | you | JanLee's sign-in password, 12+ characters |
| `SESSION_SECRET` | you | any long random string (40+ characters); changing it signs everyone out |
| `ADMIN_EMAIL` | optional | defaults to `interiorsbyjanlee@gmail.com` |
| `BLOB_ACCESS` | optional | `private` (default) or `public` if the Blob store was created as public |

After adding or changing variables: **Deployments → ⋯ → Redeploy**.
If anything is missing, `/admin/` shows an "Almost ready" screen listing exactly which names to add.

## Signing in

- Email: `interiorsbyjanlee@gmail.com` · Password: the value of `ADMIN_PASSWORD`.
- She can change the password in the CRM (**account button → Change password**). A changed password replaces `ADMIN_PASSWORD`.
- **Forgot password:** set a new `ADMIN_PASSWORD` in Vercel and redeploy — it takes over immediately (and becomes the password until she changes it again).
- **Lost phone / laptop:** account button → **Sign out on all devices**.

## Database changes

`db/schema.sql` is safe to re-run. To apply it (only needed after schema edits):

```bash
npm run db:migrate
```

(with `DATABASE_URL` set in your terminal session — never commit it).

## Security

- Sessions are signed, `HttpOnly`, `Secure`, `SameSite=Strict` cookies (14 days); the browser never sees a token.
- Every write must come from the same site with the CRM's custom header (blocks cross-site requests).
- Passwords are stored as scrypt hashes; failed sign-ins are rate-limited (5 per IP / 15 min, 30 overall).
- The API only accepts known tables and columns, and every value is a bound SQL parameter.
- Files are private in Vercel Blob and are only served to a signed-in session; uploads are limited to images, PDF, Word, Excel and text up to 4 MB (large photos are shrunk in the browser first).
- `/admin/` and `/api/` are `noindex`, blocked in `robots.txt`, and the dashboard has its own strict Content-Security-Policy.
- Turn on two-factor authentication for the Vercel, Neon and GitHub accounts.

## Backups

Neon keeps point-in-time history (free plan: 6 hours, paid plans longer). Use **Export leads (CSV)** monthly as an extra copy.
