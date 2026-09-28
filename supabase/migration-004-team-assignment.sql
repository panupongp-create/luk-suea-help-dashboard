-- Migration 004: route public requests to operation teams assembled by the central office.
-- Existing subcenter assignments are retained so historical subcenter workspaces keep working.

alter table public.public_requests
  add column if not exists assigned_team_name text;

create table if not exists public.request_team_assignments (
  request_id uuid primary key references public.requests(id) on delete cascade,
  team_id uuid not null references public.operation_teams(id),
  assigned_by_user uuid references public.app_users(id),
  note text,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_request_team_assignments_team
  on public.request_team_assignments(team_id,assigned_at desc);

alter table public.request_team_assignments enable row level security;
revoke all on public.request_team_assignments from anon,authenticated;

create or replace function public.refresh_public_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_completed integer;
  v_status public.workflow_status;
  v_step text;
  v_center_name text;
  v_team_name text;
begin
  select count(*) filter (where status='completed'),
         case when bool_or(status='blocked') then 'blocked'::public.workflow_status
              when count(*) filter (where status='completed') >= 8 then 'completed'::public.workflow_status
              when bool_or(status='in_progress') or count(*) filter (where status='completed') > 0 then 'in_progress'::public.workflow_status
              else 'pending'::public.workflow_status end
    into v_completed,v_status
    from public.workflow_steps
   where request_id=p_request_id;

  select step_name into v_step
    from public.workflow_steps
   where request_id=p_request_id and status<>'completed'
   order by step_order limit 1;
  if v_step is null then
    select step_name into v_step
      from public.workflow_steps
     where request_id=p_request_id
     order by step_order desc limit 1;
  end if;

  select c.name into v_center_name
    from public.request_assignments a
    join public.subcenters c on c.id=a.center_id
   where a.request_id=p_request_id;

  select t.team_no || ' · ' || case t.team_type
           when 'relief_packing' then 'ชุดจัดเตรียมและสนับสนุนสิ่งของช่วยเหลือ'
           when 'shelter_support' then 'ชุดสนับสนุนศูนย์พักพิง'
           when 'child_friendly' then 'ชุดสนับสนุนเด็กในพื้นที่ปลอดภัย'
           when 'school_recovery' then 'ชุดฟื้นฟูสถานศึกษา'
           else 'ชุดปฏิบัติการ'
         end
    into v_team_name
    from public.request_team_assignments ta
    join public.operation_teams t on t.id=ta.team_id
   where ta.request_id=p_request_id;

  insert into public.public_requests(
    id,request_no,received_at,location_name,organization,mission,
    personnel_required,operation_start_at,priority,overall_status,
    current_step,completed_steps,assigned_center_name,assigned_team_name,updated_at
  )
  select r.id,r.request_no,r.received_at,r.location_name,r.organization,r.mission,
         r.personnel_required,r.operation_start_at,r.priority,
         coalesce(v_status,'pending'),coalesce(v_step,'รับคำร้อง'),coalesce(v_completed,0),
         v_center_name,v_team_name,now()
    from public.requests r
   where r.id=p_request_id
  on conflict(id) do update set
    request_no=excluded.request_no,
    received_at=excluded.received_at,
    location_name=excluded.location_name,
    organization=excluded.organization,
    mission=excluded.mission,
    personnel_required=excluded.personnel_required,
    operation_start_at=excluded.operation_start_at,
    priority=excluded.priority,
    overall_status=excluded.overall_status,
    current_step=excluded.current_step,
    completed_steps=excluded.completed_steps,
    assigned_center_name=excluded.assigned_center_name,
    assigned_team_name=excluded.assigned_team_name,
    updated_at=now();
end $$;

create or replace function public.get_central_workspace_by_session(p_session_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  return jsonb_build_object(
    'label',v_user.display_name,
    'volunteers',coalesce((select jsonb_agg(to_jsonb(v)-'edit_token_hash' order by v.created_at desc) from public.volunteers v),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(team_data) order by team_data.operation_start_at desc) from (
      select t.id,t.team_no,t.team_type,t.operation_area,t.operation_start_at,t.operation_end_at,t.notes,t.created_at,
             leader.full_name as leader_name,
             (select count(*) from public.operation_team_members tm where tm.team_id=t.id) as member_count,
             coalesce((select jsonb_agg(jsonb_build_object('volunteer_id',tm.volunteer_id,'full_name',mv.full_name,'role',tm.role,'notes',tm.notes,'is_leader',tm.is_leader) order by tm.is_leader desc,mv.full_name) from public.operation_team_members tm join public.volunteers mv on mv.id=tm.volunteer_id where tm.team_id=t.id),'[]'::jsonb) as members
      from public.operation_teams t join public.volunteers leader on leader.id=t.leader_volunteer_id
    ) team_data),'[]'::jsonb),
    'centers',coalesce((select jsonb_agg(to_jsonb(c)-'access_token_hash' order by c.center_code) from public.subcenters c),'[]'::jsonb),
    'requests',coalesce((
      select jsonb_agg(
        ((to_jsonb(r)-'edit_token_hash') || jsonb_build_object(
          'assigned_center_id',a.center_id,
          'assigned_center_name',c.name,
          'center_assignment_note',a.note,
          'assigned_team_id',ta.team_id,
          'assigned_team_no',t.team_no,
          'assigned_team_type',t.team_type,
          'assigned_team_leader',leader.full_name,
          'assignment_note',ta.note
        )) order by r.received_at desc
      )
      from public.requests r
      left join public.request_assignments a on a.request_id=r.id
      left join public.subcenters c on c.id=a.center_id
      left join public.request_team_assignments ta on ta.request_id=r.id
      left join public.operation_teams t on t.id=ta.team_id
      left join public.volunteers leader on leader.id=t.leader_volunteer_id
    ),'[]'::jsonb)
  );
end $$;

create or replace function public.assign_request_to_team_by_session(
  p_session_token text,
  p_request_id uuid,
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
  if not exists(select 1 from public.operation_teams where id=p_team_id) then
    raise exception 'ไม่พบชุดปฏิบัติการ';
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

drop trigger if exists request_team_assignments_refresh_public on public.request_team_assignments;
create trigger request_team_assignments_refresh_public
after insert or update or delete on public.request_team_assignments
for each row execute function public.trigger_refresh_public_request();

revoke all on function public.assign_request_to_team_by_session(text,uuid,uuid,text) from public,authenticated;
grant execute on function public.assign_request_to_team_by_session(text,uuid,uuid,text) to anon;

do $$
declare
  v_request record;
begin
  for v_request in select id from public.requests loop
    perform public.refresh_public_request(v_request.id);
  end loop;
end $$;

select 'migration-004-team-assignment-ok' as result;
