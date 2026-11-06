-- Direct profile FK enables PostgREST profile embedding for conversation members.
alter table public.native_conversation_participants
  add constraint native_participants_profile_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create or replace function private.create_native_conversation_impl(p_member_ids uuid[], p_title text default null)
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
  if (select count(*) from public.profiles p where p.id = any(v_members)) <> v_count then
    raise exception 'One or more participants do not have a Dropchat profile';
  end if;
  if v_count = 2 then
    select nc.id into v_conversation_id
    from public.native_conversations nc
    join public.native_conversation_participants p on p.conversation_id = nc.id
    where nc.is_group = false
    group by nc.id
    having count(*) = 2
      and array_agg(p.user_id order by p.user_id) =
        (select array_agg(member_id order by member_id) from unnest(v_members) as member_id)
    limit 1;
    if v_conversation_id is not null then return v_conversation_id; end if;
  end if;
  insert into public.native_conversations(created_by, title, is_group)
  values (v_user_id, nullif(trim(p_title), ''), v_count > 2)
  returning id into v_conversation_id;
  insert into public.native_conversation_participants(conversation_id, user_id)
  select v_conversation_id, member_id from unnest(v_members) as member_id;
  return v_conversation_id;
end;
$function$;
