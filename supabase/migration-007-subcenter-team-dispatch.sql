-- Migration 007: central assigns requests to a subcenter; that subcenter chooses its own team.

create or replace function public.assign_request_to_center_by_session(
  p_session_token text,
  p_request_id uuid,
  p_center_id uuid,
  p_note text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_previous_center_id uuid;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  if not exists(select 1 from public.requests where id=p_request_id) then
    raise exception 'ไม่พบคำร้อง';
  end if;
  if not exists(select 1 from public.subcenters where id=p_center_id and active) then
    raise exception 'ไม่พบศูนย์ย่อยหรือศูนย์ถูกปิดใช้งาน';
  end if;

  select center_id into v_previous_center_id
  from public.request_assignments where request_id=p_request_id;

  insert into public.request_assignments(request_id,center_id,assigned_by_user,note)
  values(p_request_id,p_center_id,v_user.id,nullif(trim(p_note),''))
  on conflict(request_id) do update set
    center_id=excluded.center_id,
    assigned_by_user=excluded.assigned_by_user,
    note=excluded.note,
    assigned_at=now(),
    updated_at=now();

  -- A team belongs to one center. Clear the old assignment when central moves the case.
  if v_previous_center_id is distinct from p_center_id then
    delete from public.request_team_assignments where request_id=p_request_id;
  end if;

  perform public.refresh_public_request(p_request_id);
end $$;

create or replace function public.assign_request_to_team_by_subcenter_session(
  p_session_token text,
  p_request_id uuid,
  p_team_id uuid,
  p_note text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'subcenter');
  if not exists(select 1 from public.requests where id=p_request_id) then
    raise exception 'ไม่พบคำร้อง';
  end if;
  if not exists(
    select 1 from public.request_assignments
    where request_id=p_request_id and center_id=v_user.center_id
  ) then
    raise exception 'คำร้องนี้ไม่ได้ถูกส่งต่อมาที่ศูนย์ของท่าน';
  end if;
  if not exists(
    select 1 from public.operation_teams
    where id=p_team_id and center_id=v_user.center_id
  ) then
    raise exception 'เลือกได้เฉพาะชุดปฏิบัติการของศูนย์ของท่าน';
  end if;

  insert into public.request_team_assignments(request_id,team_id,assigned_by_user,note)
  values(p_request_id,p_team_id,v_user.id,nullif(trim(p_note),''))
  on conflict(request_id) do update set
    team_id=excluded.team_id,
    assigned_by_user=excluded.assigned_by_user,
    note=excluded.note,
    assigned_at=now(),
    updated_at=now();

  perform public.refresh_public_request(p_request_id);
end $$;

-- Disable the previous central RPCs that allowed central staff to assign teams directly.
revoke all on function public.assign_request_to_center_and_team_by_session(text,uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.assign_request_to_team_by_session(text,uuid,uuid,text) from public,anon,authenticated;

revoke all on function public.assign_request_to_center_by_session(text,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.assign_request_to_team_by_subcenter_session(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.assign_request_to_center_by_session(text,uuid,uuid,text) to anon;
grant execute on function public.assign_request_to_team_by_subcenter_session(text,uuid,uuid,text) to anon;

select 'migration-007-subcenter-team-dispatch-ok' as result;
