-- Dropchat native messenger foundation
-- Applied to Supabase project znsfympdahjkxpuanaxc on 2026-11-06.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]{3,24}$')
);

create table if not exists public.native_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  is_group boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.native_conversation_participants (
  conversation_id uuid not null references public.native_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.native_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.native_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint native_messages_content_length check (char_length(content) between 1 and 10000)
);

create index if not exists native_participants_user_idx on public.native_conversation_participants(user_id, conversation_id);
create index if not exists native_messages_conversation_created_idx on public.native_messages(conversation_id, created_at desc);
create index if not exists native_conversations_updated_idx on public.native_conversations(updated_at desc);

alter table public.profiles enable row level security;
alter table public.native_conversations enable row level security;
alter table public.native_conversation_participants enable row level security;
alter table public.native_messages enable row level security;

create policy "Authenticated users can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users can create their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.create_native_conversation(p_member_ids uuid[], p_title text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_members uuid[];
  v_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_member_ids is null then raise exception 'At least one other participant is required'; end if;
  select array_agg(distinct member_id) into v_members from unnest(p_member_ids || v_user_id) as member_id;
  v_count := coalesce(cardinality(v_members), 0);
  if v_count < 2 or v_count > 50 then raise exception 'A conversation must have between 2 and 50 participants'; end if;
  if (select count(*) from auth.users u where u.id = any(v_members)) <> v_count then
    raise exception 'One or more participants do not exist';
  end if;
  insert into public.native_conversations(created_by, title, is_group)
  values (v_user_id, nullif(trim(p_title), ''), v_count > 2)
  returning id into v_conversation_id;
  insert into public.native_conversation_participants(conversation_id, user_id)
  select v_conversation_id, member_id from unnest(v_members) as member_id;
  return v_conversation_id;
end;
$function$;

revoke all on function public.create_native_conversation(uuid[], text) from public, anon;
grant execute on function public.create_native_conversation(uuid[], text) to authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
