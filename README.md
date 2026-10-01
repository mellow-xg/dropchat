# Dropchat

Dropchat is a Next.js interface for reading and sending messages across connected platforms. It uses Supabase for authentication, conversations, messages, and realtime updates, while a separate backend handles platform-specific delivery and account pairing.

## Project structure

- app: Next.js App Router pages, layout, and global styles
- components: Reusable chat and authentication UI
- hooks: Client-side realtime message hooks
- lib: Shared Supabase client, types, and configuration

## Local setup

1. Run npm install.
2. Copy .env.example to .env.local and add your project values.
3. Run npm run dev.
4. Open http://localhost:3000.

## Environment variables

- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase publishable or legacy anonymous key
- NEXT_PUBLIC_BACKEND_URL: Dropchat message and pairing backend URL

Never expose a Supabase service-role or secret key through a NEXT_PUBLIC_ variable.

## Backend requirements

The backend must expose POST /api/messages/send and POST /api/whatsapp/pair, validate Supabase access tokens, and allow the frontend origin through CORS. The pairing endpoint should return a JSON object with a code field.

## Database note

Unread badges expect an unread_count integer column on conversations with a default of 0. Enable Row Level Security on exposed tables and restrict users to their own conversations and messages.

## Deployment

Import this repository into Vercel, configure the three environment variables, and redeploy.
