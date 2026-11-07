-- Harden participant read-state updates and add database-enforced message throttling.
revoke update on table public.native_conversation_participants from authenticated;
grant update (last_read_at) on table public.native_conversation_participants to authenticated;

create index if not exists native_messages_sender_created_idx
  on public.native_messages(sender_id, created_at desc);

create or replace function private.enforce_native_message_rate_limit()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare v_recent_count integer;
begin
  if new.sender_id is distinct from auth.uid() then
    raise exception 'Sender must match the authenticated user';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 0));
  select count(*) into v_recent_count from public.native_messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if v_recent_count >= 30 then
    raise exception 'Message rate limit exceeded. Try again shortly.';
  end if;
  return new;
end;
$function$;

revoke all on function private.enforce_native_message_rate_limit() from public, anon, authenticated;
drop trigger if exists native_message_rate_limit_trigger on public.native_messages;
create trigger native_message_rate_limit_trigger before insert on public.native_messages
for each row execute function private.enforce_native_message_rate_limit();
