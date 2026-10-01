# Setup notes

npm i @supabase/supabase-js lucide-react

.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

tsconfig.json -> "paths": { "@/*": ["./*"] }

SQL (unread badges need this column):
alter table conversations add column if not exists unread_count int not null default 0;

Backend must:
- return { code: "ABCD1234" } from POST /api/whatsapp/pair
- enable CORS for the frontend origin

## Deploy to Vercel (project name: dropchat)
1. Push this folder to a GitHub repo (repo root = this folder).
2. vercel.com -> Add New -> Project -> import the repo -> name it "dropchat" -> Deploy.
3. Project Settings -> Environment Variables, add:
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_BACKEND_URL
4. Redeploy so the variables take effect.
