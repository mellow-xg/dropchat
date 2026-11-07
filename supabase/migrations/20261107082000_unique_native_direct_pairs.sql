-- Guarantee one native direct conversation per unordered user pair.
create table if not exists private.native_direct_pairs (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null unique references public.native_conversations(id) on delete cascade,
  primary key (user_a,user_b),
  constraint native_direct_pair_order check (user_a < user_b)
);
revoke all on table private.native_direct_pairs from public,anon,authenticated;

with direct_conversations as (
  select nc.id as conversation_id,
         nc.created_at,
         array_agg(p.user_id order by p.user_id) as members
  from public.native_conversations nc
  join public.native_conversation_participants p on p.conversation_id=nc.id
  where nc.is_group=false
  group by nc.id,nc.created_at
  having count(*)=2
), preferred as (
  select distinct on (members[1],members[2])
         members[1] as user_a,members[2] as user_b,conversation_id
  from direct_conversations
  order by members[1],members[2],created_at,conversation_id
)
insert into private.native_direct_pairs(user_a,user_b,conversation_id)
select user_a,user_b,conversation_id from preferred
on conflict (user_a,user_b) do nothing;

create or replace function private.create_native_conversation_impl(p_member_ids uuid[],p_title text default null)
returns uuid language plpgsql security definer
set search_path = pg_catalog,public,private,pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_existing_conversation_id uuid;
  v_members uuid[];
  v_count integer;
  v_member_a uuid;
  v_member_b uuid;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_member_ids is null then raise exception 'At least one other participant is required'; end if;
  select array_agg(distinct member_id) into v_members from unnest(p_member_ids || v_user_id) as member_id;
  v_count := coalesce(cardinality(v_members),0);
  if v_count < 2 or v_count > 50 then
    raise exception 'A conversation must have between 2 and 50 participants';
  end if;
  if (select count(*) from public.profiles p where p.id=any(v_members)) <> v_count then
    raise exception 'One or more participants do not have a Dropchat profile';
  end if;
  if v_count=2 then
    v_member_a := least(v_members[1],v_members[2]);
    v_member_b := greatest(v_members[1],v_members[2]);
    select conversation_id into v_existing_conversation_id
    from private.native_direct_pairs where user_a=v_member_a and user_b=v_member_b;
    if v_existing_conversation_id is not null then return v_existing_conversation_id; end if;
  end if;
  insert into public.native_conversations(created_by,title,is_group)
  values (v_user_id,nullif(trim(p_title),''),v_count>2)
  returning id into v_conversation_id;
  insert into public.native_conversation_participants(conversation_id,user_id)
  select v_conversation_id,member_id from unnest(v_members) as member_id;
  if v_count=2 then
    insert into private.native_direct_pairs(user_a,user_b,conversation_id)
    values (v_member_a,v_member_b,v_conversation_id)
    on conflict (user_a,user_b) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted=0 then
      select conversation_id into v_existing_conversation_id
      from private.native_direct_pairs where user_a=v_member_a and user_b=v_member_b;
      delete from public.native_conversations where id=v_conversation_id;
      return v_existing_conversation_id;
    end if;
  end if;
  return v_conversation_id;
end;
$function$;
