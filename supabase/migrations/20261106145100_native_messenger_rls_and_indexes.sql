-- Native messenger RLS helper and indexes.
-- The membership helper lives in a non-exposed schema to avoid recursive RLS
-- evaluation when participant membership is checked by table policies.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_native_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select exists (
    select 1
    from public.native_conversation_participants p
    where p.conversation_id = p_conversation_id
      and p.user_id = auth.uid()
  );
$function$;

revoke all on function private.is_native_conversation_member(uuid) from public, anon;
grant execute on function private.is_native_conversation_member(uuid) to authenticated;

create policy "Participants can view native conversations"
  on public.native_conversations for select to authenticated
  using (private.is_native_conversation_member(id));

create policy "Participants can view conversation members"
  on public.native_conversation_participants for select to authenticated
  using (private.is_native_conversation_member(conversation_id));

create policy "Participants can read native messages"
  on public.native_messages for select to authenticated
  using (private.is_native_conversation_member(conversation_id));

create policy "Participants can send native messages"
  on public.native_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_native_conversation_member(conversation_id)
  );

create index if not exists messages_conversation_user_idx
  on public.messages(conversation_id, user_id);
