-- Keep test records in storage while excluding them from public registration totals.
create or replace function public.is_test_request(p_request_id uuid)
returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((
    select to_jsonb(r)::text ~* '(ทดสอบ|test)'
    from public.requests r
    where r.id=p_request_id
  ),false);
$$;

revoke all on function public.is_test_request(uuid) from public;
grant execute on function public.is_test_request(uuid) to anon,authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='app_api') then
    grant execute on function public.is_test_request(uuid) to app_api;
  end if;
end $$;

drop policy if exists "Public dashboard is readable" on public.public_requests;
create policy "Public dashboard is readable" on public.public_requests
  for select to anon,authenticated using (not public.is_test_request(id));

create or replace function public.get_public_volunteer_stats()
returns table(group_no smallint,total bigint,available bigint)
language sql stable security definer set search_path=public as $$
  select groups.group_no::smallint,
         count(v.id)::bigint,
         count(v.id) filter (where v.active)::bigint
  from generate_series(1,6) groups(group_no)
  left join public.volunteers v
    on v.group_no=groups.group_no
   and concat_ws(' ',v.registration_no,v.scoutdd_id,v.full_name,v.organization_network,
     v.phone,v.operational_areas,v.skills,v.vehicle,v.equipment,v.availability_details)
     !~* '(ทดสอบ|test)'
  group by groups.group_no
  order by groups.group_no;
$$;
