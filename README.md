# Dropchat

Dropchat is a first-party messaging service and a multi-platform messaging client.

**Important product boundary:** Native Messages is Dropchat's own messenger. WhatsApp, Telegram, Instagram Direct and SMS are separate messaging environments. Selecting a platform filters/navigates to that platform; external conversations are not mixed into the Native Messages inbox.

## Current application

- Next.js App Router, React and TypeScript.
- Supabase Auth and PostgreSQL conversation/message data.
- Realtime conversation and message subscriptions.
- Platform selector for Native, WhatsApp, Telegram, Instagram and SMS.
- Native is the default inbox and is queried separately with `platform = 'native'`.
- WhatsApp pairing uses the separately operated bridge backend.
- Telegram and Instagram linking are not implemented in this repository yet.
- SMS is currently a navigation/type placeholder; device SMS integration is not implemented.
- The Native inbox UI is separated, but first-party contact discovery, direct-chat creation, group membership and a complete native messaging service are still development work.

## Project structure

```text
app/          Next.js App Router pages, layout and global styles
components/   Authentication, platform switcher, conversation list and chat UI
hooks/        Client-side realtime message hooks
lib/          Supabase client and shared types
utils/        Supabase server/session helpers
```

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and configure the Supabase URL and publishable key.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (legacy anon key is also accepted) |
| `NEXT_PUBLIC_BACKEND_URL` | HTTPS URL of the separately deployed Dropchat bridge backend |

Never put a Supabase secret/service-role key or platform credential in a `NEXT_PUBLIC_` variable or browser code.

## Bridge backend contract

The current frontend expects the separately deployed backend to:

- expose `POST /api/messages/send`;
- expose `POST /api/whatsapp/pair`;
- validate the Supabase access token from the Authorization bearer header;
- derive the user identity from verified token claims, never from a client-supplied user ID;
- verify ownership of every conversation and connected account;
- enforce restrictive CORS and HTTPS in production.

The bridge service is not included in this repository. A successful frontend build does not prove that the bridge is deployed or that message delivery works.

## Database and authorization

The existing application expects `connected_accounts`, `conversations` and `messages`. Unread badges also expect:

```sql
alter table public.conversations
add column if not exists unread_count integer not null default 0;
```

Enable and test RLS on every exposed table. Policies must scope records to the authenticated user or authorized conversation membership. Do not rely on client-side filters as an authorization boundary. Realtime publication and storage access must follow the same ownership model.

## V2 product rules

1. Native Messages contains Dropchat-native conversations only.
2. External platform views remain separate and use platform-specific integration adapters.
3. Same display names across platforms do not imply the same identity.
4. UI controls must not imply unsupported capabilities such as calling, background notifications or message synchronization.
5. Each adapter must publish a capability list based on verified implementation behavior.
6. Offline cached history and queued sending must be tested per platform before being advertised.

See [V2 implementation status](docs/IMPLEMENTATION_STATUS_V2.md) for current scope and next steps.
