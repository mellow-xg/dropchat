-- Maintain native conversation previews and per-user read state.
alter table public.native_conversations
  add column if not exists last_message text,
  add column if not exists last_message_at timestamptz;

create policy "Users can update their own native read state"
  on public.native_conversation_participants for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function private.bump_native_conversation_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.native_conversations
  set last_message = left(new.content, 500),
      last_message_at = new.created_at,
      updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$function$;

revoke all on function private.bump_native_conversation_activity() from public, anon, authenticated;

create trigger native_message_activity_trigger
after insert on public.native_messages
for each row execute function private.bump_native_conversation_activity();
