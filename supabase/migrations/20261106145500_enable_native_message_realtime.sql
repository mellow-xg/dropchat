-- Enable Supabase Realtime change events for first-party native messages.
alter publication supabase_realtime add table public.native_messages;
