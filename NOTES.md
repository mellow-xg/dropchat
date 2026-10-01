# Maintainer notes

- The browser and server Supabase clients use cookie-backed sessions through `@supabase/ssr`.
- `middleware.ts` refreshes sessions for this Next.js 15 project. If upgrading to Next.js 16, follow its middleware-to-proxy migration.
- The unread badge requires `conversations.unread_count integer not null default 0`.
- The bridge service is a separate deployment. It must authenticate Supabase access tokens and authorize every conversation/account operation against the verified user.
- Keep `.env.local` and production secrets out of source control. Start from `.env.example`.

