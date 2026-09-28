-- Migration 005: assign each request to both a subcenter and an operation team.
-- The subcenter remains the staff workspace owner and receives full team details.

create or replace function public.assign_request_to_center_and_team_by_session(
  p_session_token text,
  p_request_id uuid,
  p_center_id uuid,
  p_team_id uuid,
  p_note text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'central');

  if not exists(select 1 from public.requests where id=p_request_id) then
    raise exception 'ไม่พบคำร้อง';
  end if;
  if not exists(select 1 from public.subcenters where id=p_center_id and active) then
    raise exception 'ไม่พบศูนย์ย่อยหรือศูนย์ถูกปิดใช้งาน';
  end if;
  if not exists(select 1 from public.operation_teams where id=p_team_id) then
    raise exception 'ไม่พบชุดปฏิบัติการ';
  end if;

  insert into public.request_assignments(request_id,center_id,assigned_by_user,note)
  values(p_request_id,p_center_id,v_user.id,nullif(trim(p_note),''))
  on conflict(request_id) do update set
    center_id=excluded.center_id,
    assigned_by_user=excluded.assigned_by_user,
    note=excluded.note,
    assigned_at=now(),
    updated_at=now();

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

create or replace function public.get_subcenter_workspace_by_session(p_session_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'subcenter');
  return jsonb_build_object(
    'center',(select to_jsonb(c)-'access_token_hash' from public.subcenters c where c.id=v_user.center_id),
    'requests',coalesce((select jsonb_agg(jsonb_build_object(
      'request',((to_jsonb(r)-'edit_token_hash') || jsonb_build_object(
        'overall_status',pr.overall_status,
        'current_step',pr.current_step,
        'completed_steps',pr.completed_steps,
        'assigned_center_id',a.center_id,
        'assigned_center_name',c.name,
        'assigned_team_id',ta.team_id,
        'assigned_team_no',t.team_no,
        'assigned_team_type',t.team_type,
        'assigned_team_leader',leader.full_name,
        'assigned_team_area',t.operation_area,
        'assigned_team_start_at',t.operation_start_at,
        'assigned_team_end_at',t.operation_end_at,
        'assigned_team_members',coalesce((
          select jsonb_agg(jsonb_build_object(
            'volunteer_id',tm.volunteer_id,
            'full_name',member.full_name,
            'role',tm.role,
            'skills',member.skills,
            'is_leader',tm.is_leader
          ) order by tm.is_leader desc,member.full_name)
          from public.operation_team_members tm
          join public.volunteers member on member.id=tm.volunteer_id
          where tm.team_id=t.id
        ),'[]'::jsonb),
        'assignment_note',coalesce(ta.note,a.note)
      )),
      'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.step_order) from public.workflow_steps s where s.request_id=r.id),'[]'::jsonb)
    ) order by a.assigned_at desc)
      from public.request_assignments a
      join public.requests r on r.id=a.request_id
      join public.subcenters c on c.id=a.center_id
      left join public.public_requests pr on pr.id=r.id
      left join public.request_team_assignments ta on ta.request_id=r.id
      left join public.operation_teams t on t.id=ta.team_id
      left join public.volunteers leader on leader.id=t.leader_volunteer_id
     where a.center_id=v_user.center_id),'[]'::jsonb)
  );
end $$;

revoke all on function public.assign_request_to_center_and_team_by_session(text,uuid,uuid,uuid,text) from public,authenticated;
grant execute on function public.assign_request_to_center_and_team_by_session(text,uuid,uuid,uuid,text) to anon;

select 'migration-005-center-team-dispatch-ok' as result;
