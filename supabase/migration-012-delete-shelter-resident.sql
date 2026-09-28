-- Allow an authenticated subcenter session to delete only its own shelter resident records.
create or replace function public.delete_shelter_resident_by_session(
  p_session_token text,
  p_resident_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user public.app_users;
begin
  v_user := public.require_staff_user(p_session_token, 'subcenter');
  if not exists (
    select 1 from public.subcenters where id=v_user.center_id and active
  ) then
    raise exception 'ศูนย์ย่อยนี้ไม่พร้อมใช้งาน';
  end if;

  delete from public.shelter_residents
  where id=p_resident_id and center_id=v_user.center_id;
  if not found then
    raise exception 'ไม่พบข้อมูลผู้พักพิงของศูนย์นี้';
  end if;
end;
$$;

revoke all on function public.delete_shelter_resident_by_session(text,uuid) from public, authenticated;
grant execute on function public.delete_shelter_resident_by_session(text,uuid) to anon;

select 'migration-012-delete-shelter-resident-ok' as result;
