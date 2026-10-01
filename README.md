# Dropchat

Dropchat is a chat inbox for reading and sending messages across connected platforms. The Next.js app uses Supabase for authentication, conversation data, and realtime updates. A separately operated bridge backend handles platform-specific delivery and WhatsApp account pairing.

## Project structure

```text
app/          Next.js App Router pages, layout, and global styles
components/   Reusable chat and authentication UI
hooks/        Client-side realtime message hooks
lib/          Shared Supabase client, types, and configuration
```

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add your project values.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (a legacy anon key is also accepted by Supabase) |
| `NEXT_PUBLIC_BACKEND_URL` | HTTPS URL of the deployed Dropchat bridge backend |

The first two values are required. Never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable or in browser code.

## Backend requirements

The frontend expects the backend to:

- expose `POST /api/messages/send`;
- expose `POST /api/whatsapp/pair` and return `{ "code": "ABCD1234" }`;
- accept the frontend origin through CORS; and
- validate the Supabase access token sent by authenticated requests and derive the user identity from its verified claims (never trust a user ID supplied in the request body);
- enforce ownership checks for the requested conversation/account; and
- run behind HTTPS with restrictive CORS for the production app origin.

## Database note

Unread badges expect an `unread_count` column on `conversations`:

```sql
alter table conversations
add column if not exists unread_count integer not null default 0;
```

Before launch, enable Row Level Security on every exposed table (including `conversations`, `messages`, `connected_accounts`, and `todos`, if used). Policies must scope reads and writes to the authenticated owner; do not rely on client-side filters. Ensure Realtime is enabled only for the tables and access model you intend to expose.

## Production launch checklist

- Configure the production Supabase URL and publishable key and the HTTPS bridge URL in Vercel for Production; use separate projects/keys for Preview where possible.
- Configure Supabase Auth site URL, allowed redirect URLs, email confirmation, SMTP, and password/security settings for the production domain.
- Apply and review database migrations and owner-scoped RLS policies in the production Supabase project.
- Deploy and monitor the bridge backend separately; this repository does not contain that service.
- Confirm WhatsApp pairing and message delivery end to end. Telegram and Instagram linking are not implemented yet.
- Set a custom domain, verify HTTPS, and test sign-up, sign-in, session refresh, sign-out, realtime, and failure states before inviting users.

The app's `/todos` route is a protected Supabase example route; it requires a `todos` table with `id` and `name` columns and appropriate RLS policies. The main `/` route is the chat inbox.


