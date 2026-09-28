-- Migration 006: register volunteers with a subcenter and let each subcenter manage its own teams.

alter table public.volunteers
  add column if not exists subcenter_id uuid references public.subcenters(id);

alter table public.operation_teams
  add column if not exists center_id uuid references public.subcenters(id);

update public.volunteers v
set subcenter_id=c.id,
    organization_network=c.name
from public.subcenters c
where v.subcenter_id is null
  and (lower(trim(v.organization_network))=lower(trim(c.name)) or lower(v.organization_network) like '%'||lower(c.name)||'%');

update public.operation_teams t
set center_id=v.subcenter_id
from public.volunteers v
where t.center_id is null
  and v.id=t.leader_volunteer_id
  and v.subcenter_id is not null;

update public.operation_teams t
set center_id=a.center_id
from public.request_team_assignments ta
join public.request_assignments a on a.request_id=ta.request_id
where t.center_id is null
  and t.id=ta.team_id;

create index if not exists idx_volunteers_subcenter on public.volunteers(subcenter_id,active);
create index if not exists idx_operation_teams_center on public.operation_teams(center_id,operation_start_at desc);

create or replace function public.get_public_subcenters()
returns table(id uuid,center_code text,name text)
language sql stable security definer set search_path=public as $$
  select c.id,c.center_code,c.name
  from public.subcenters c
  where c.active
  order by c.center_code;
$$;

create or replace function public.register_public_volunteer(p_payload jsonb)
returns table(volunteer_id uuid,registration_no text,edit_token text)
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid();
  v_token text:=encode(extensions.gen_random_bytes(24),'hex');
  v_no text;
  v_group smallint;
  v_center_id uuid:=nullif(trim(p_payload->>'subcenter_id'),'')::uuid;
  v_center_name text;
begin
  v_group:=(p_payload->>'group_no')::smallint;
  select c.name into v_center_name from public.subcenters c where c.id=v_center_id and c.active;
  if v_group not between 1 and 6
     or v_center_name is null
     or nullif(trim(p_payload->>'national_id'),'') is null
     or trim(p_payload->>'national_id') !~ '^[0-9]{13}$'
     or nullif(trim(p_payload->>'full_name'),'') is null
     or nullif(trim(p_payload->>'phone'),'') is null
     or nullif(trim(p_payload->>'operational_areas'),'') is null
     or nullif(trim(p_payload->>'skills'),'') is null
     or nullif(trim(p_payload->>'availability_details'),'') is null then
    raise exception 'กรุณากรอกข้อมูลทะเบียนและเลือกศูนย์ย่อยให้ครบถ้วน';
  end if;

  v_no:='VOL-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.volunteer_number_seq')::text,5,'0');
  insert into public.volunteers(id,registration_no,group_no,subcenter_id,scoutdd_id,national_id,full_name,organization_network,phone,operational_areas,skills,vehicle,equipment,availability_details,edit_token_hash)
  values(v_id,v_no,v_group,v_center_id,nullif(trim(p_payload->>'scoutdd_id'),''),trim(p_payload->>'national_id'),trim(p_payload->>'full_name'),v_center_name,trim(p_payload->>'phone'),trim(p_payload->>'operational_areas'),trim(p_payload->>'skills'),nullif(trim(p_payload->>'vehicle'),''),nullif(trim(p_payload->>'equipment'),''),trim(p_payload->>'availability_details'),extensions.digest(v_token,'sha256'));

  return query select v_id,v_no,v_token;
exception when unique_violation then
  raise exception 'เลขประจำตัวประชาชนนี้มีอยู่ในทะเบียนแล้ว';
end $$;

create or replace function public.get_central_workspace_by_session(p_session_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  return jsonb_build_object(
    'label',v_user.display_name,
    'volunteers',coalesce((
      select jsonb_agg((to_jsonb(v)-'edit_token_hash')||jsonb_build_object('center_name',c.name) order by v.created_at desc)
      from public.volunteers v left join public.subcenters c on c.id=v.subcenter_id
    ),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(team_data) order by team_data.operation_start_at desc) from (
      select t.id,t.team_no,t.team_type,t.center_id,c.name as center_name,t.operation_area,t.operation_start_at,t.operation_end_at,t.notes,t.created_at,
             leader.full_name as leader_name,
             (select count(*) from public.operation_team_members tm where tm.team_id=t.id) as member_count,
             coalesce((select jsonb_agg(jsonb_build_object('volunteer_id',tm.volunteer_id,'full_name',mv.full_name,'role',tm.role,'notes',tm.notes,'is_leader',tm.is_leader) order by tm.is_leader desc,mv.full_name) from public.operation_team_members tm join public.volunteers mv on mv.id=tm.volunteer_id where tm.team_id=t.id),'[]'::jsonb) as members
      from public.operation_teams t
      join public.volunteers leader on leader.id=t.leader_volunteer_id
      left join public.subcenters c on c.id=t.center_id
    ) team_data),'[]'::jsonb),
    'centers',coalesce((select jsonb_agg(to_jsonb(c)-'access_token_hash' order by c.center_code) from public.subcenters c),'[]'::jsonb),
    'requests',coalesce((
      select jsonb_agg(((to_jsonb(r)-'edit_token_hash') || jsonb_build_object(
        'assigned_center_id',a.center_id,
        'assigned_center_name',c.name,
        'center_assignment_note',a.note,
        'assigned_team_id',ta.team_id,
        'assigned_team_no',t.team_no,
        'assigned_team_type',t.team_type,
        'assigned_team_leader',leader.full_name,
        'assignment_note',ta.note
      )) order by r.received_at desc)
      from public.requests r
      left join public.request_assignments a on a.request_id=r.id
      left join public.subcenters c on c.id=a.center_id
      left join public.request_team_assignments ta on ta.request_id=r.id
      left join public.operation_teams t on t.id=ta.team_id
      left join public.volunteers leader on leader.id=t.leader_volunteer_id
    ),'[]'::jsonb)
  );
end $$;

create or replace function public.get_subcenter_workspace_by_session(p_session_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'subcenter');
  return jsonb_build_object(
    'center',(select to_jsonb(c)-'access_token_hash' from public.subcenters c where c.id=v_user.center_id),
    'volunteers',coalesce((
      select jsonb_agg((to_jsonb(v)-'edit_token_hash')||jsonb_build_object('center_name',c.name) order by v.created_at desc)
      from public.volunteers v join public.subcenters c on c.id=v.subcenter_id
      where v.subcenter_id=v_user.center_id
    ),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(team_data) order by team_data.operation_start_at desc) from (
      select t.id,t.team_no,t.team_type,t.center_id,c.name as center_name,t.operation_area,t.operation_start_at,t.operation_end_at,t.notes,t.created_at,
             leader.full_name as leader_name,
             (select count(*) from public.operation_team_members tm where tm.team_id=t.id) as member_count,
             coalesce((select jsonb_agg(jsonb_build_object('volunteer_id',tm.volunteer_id,'full_name',mv.full_name,'role',tm.role,'notes',tm.notes,'is_leader',tm.is_leader) order by tm.is_leader desc,mv.full_name) from public.operation_team_members tm join public.volunteers mv on mv.id=tm.volunteer_id where tm.team_id=t.id),'[]'::jsonb) as members
      from public.operation_teams t
      join public.volunteers leader on leader.id=t.leader_volunteer_id
      join public.subcenters c on c.id=t.center_id
      where t.center_id=v_user.center_id
    ) team_data),'[]'::jsonb),
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
        'assigned_team_members',coalesce((select jsonb_agg(jsonb_build_object('volunteer_id',tm.volunteer_id,'full_name',member.full_name,'role',tm.role,'skills',member.skills,'is_leader',tm.is_leader) order by tm.is_leader desc,member.full_name) from public.operation_team_members tm join public.volunteers member on member.id=tm.volunteer_id where tm.team_id=t.id),'[]'::jsonb),
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

create or replace function public.create_operation_team_by_session(p_session_token text,p_payload jsonb)
returns table(team_id uuid,team_no text)
language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_id uuid:=gen_random_uuid();
  v_no text;
  v_type text:=p_payload->>'team_type';
  v_leader uuid:=(p_payload->>'leader_volunteer_id')::uuid;
  v_member jsonb;
begin
  v_user:=public.require_staff_user(p_session_token,'subcenter');
  if v_type not in ('relief_packing','shelter_support','child_friendly','school_recovery') then raise exception 'ประเภทชุดไม่ถูกต้อง'; end if;
  if not exists(select 1 from public.volunteers where id=v_leader and active and subcenter_id=v_user.center_id) then raise exception 'หัวหน้าชุดต้องเป็นกำลังที่ลงทะเบียนกับศูนย์ของท่าน'; end if;
  if nullif(trim(p_payload->>'operation_area'),'') is null or nullif(p_payload->>'operation_start_at','') is null then raise exception 'กรุณาระบุพื้นที่และวันปฏิบัติงาน'; end if;

  v_no:='TEAM-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.team_number_seq')::text,4,'0');
  insert into public.operation_teams(id,team_no,team_type,center_id,leader_volunteer_id,operation_area,operation_start_at,operation_end_at,notes)
  values(v_id,v_no,v_type,v_user.center_id,v_leader,trim(p_payload->>'operation_area'),(p_payload->>'operation_start_at')::timestamptz,nullif(p_payload->>'operation_end_at','')::timestamptz,nullif(trim(p_payload->>'notes'),''));

  for v_member in select value from jsonb_array_elements(coalesce(p_payload->'members','[]'::jsonb)) loop
    if exists(select 1 from public.volunteers where id=(v_member->>'volunteer_id')::uuid and active and subcenter_id=v_user.center_id) then
      insert into public.operation_team_members(team_id,volunteer_id,role,notes,is_leader)
      values(v_id,(v_member->>'volunteer_id')::uuid,nullif(trim(v_member->>'role'),''),nullif(trim(v_member->>'notes'),''),(v_member->>'volunteer_id')::uuid=v_leader)
      on conflict on constraint operation_team_members_pkey do update set role=excluded.role,notes=excluded.notes,is_leader=excluded.is_leader;
    end if;
  end loop;
  if not exists(select 1 from public.operation_team_members tm where tm.team_id=v_id and tm.volunteer_id=v_leader) then
    insert into public.operation_team_members(team_id,volunteer_id,role,is_leader) values(v_id,v_leader,'หัวหน้าชุด',true);
  end if;
  return query select v_id,v_no;
end $$;

create or replace function public.update_volunteer_by_session(p_session_token text,p_volunteer_id uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_center_id uuid:=nullif(trim(p_payload->>'subcenter_id'),'')::uuid;
  v_center_name text;
  v_group smallint:=(p_payload->>'group_no')::smallint;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  select c.name into v_center_name from public.subcenters c where c.id=v_center_id and c.active;
  if v_center_name is null or v_group not between 1 and 6 or trim(p_payload->>'national_id') !~ '^[0-9]{13}$'
     or nullif(trim(p_payload->>'full_name'),'') is null or nullif(trim(p_payload->>'phone'),'') is null
     or nullif(trim(p_payload->>'operational_areas'),'') is null or nullif(trim(p_payload->>'skills'),'') is null
     or nullif(trim(p_payload->>'availability_details'),'') is null then
    raise exception 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง';
  end if;
  update public.volunteers set
    group_no=v_group,subcenter_id=v_center_id,organization_network=v_center_name,
    scoutdd_id=nullif(trim(p_payload->>'scoutdd_id'),''),national_id=trim(p_payload->>'national_id'),
    full_name=trim(p_payload->>'full_name'),phone=trim(p_payload->>'phone'),
    operational_areas=trim(p_payload->>'operational_areas'),skills=trim(p_payload->>'skills'),
    vehicle=nullif(trim(p_payload->>'vehicle'),''),equipment=nullif(trim(p_payload->>'equipment'),''),
    availability_details=trim(p_payload->>'availability_details'),active=coalesce((p_payload->>'active')::boolean,false),updated_at=now()
  where id=p_volunteer_id;
  if not found then raise exception 'ไม่พบผู้ลงทะเบียน'; end if;
exception when unique_violation then
  raise exception 'เลขประจำตัวประชาชนนี้มีอยู่ในทะเบียนแล้ว';
end $$;

create or replace function public.delete_volunteer_by_session(p_session_token text,p_volunteer_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  if exists(select 1 from public.operation_team_members where volunteer_id=p_volunteer_id)
     or exists(select 1 from public.operation_teams where leader_volunteer_id=p_volunteer_id) then
    raise exception 'ผู้ลงทะเบียนอยู่ในชุดปฏิบัติการแล้ว กรุณาแก้ไขสถานะเป็นไม่พร้อมแทนการลบ';
  end if;
  delete from public.volunteers where id=p_volunteer_id;
  if not found then raise exception 'ไม่พบผู้ลงทะเบียน'; end if;
end $$;

create or replace function public.assign_request_to_center_and_team_by_session(
  p_session_token text,p_request_id uuid,p_center_id uuid,p_team_id uuid,p_note text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  if not exists(select 1 from public.requests where id=p_request_id) then raise exception 'ไม่พบคำร้อง'; end if;
  if not exists(select 1 from public.subcenters where id=p_center_id and active) then raise exception 'ไม่พบศูนย์ย่อยหรือศูนย์ถูกปิดใช้งาน'; end if;
  if not exists(select 1 from public.operation_teams where id=p_team_id and center_id=p_center_id) then raise exception 'ชุดปฏิบัติการไม่ได้อยู่ในศูนย์ย่อยที่เลือก'; end if;

  insert into public.request_assignments(request_id,center_id,assigned_by_user,note)
  values(p_request_id,p_center_id,v_user.id,nullif(trim(p_note),''))
  on conflict(request_id) do update set center_id=excluded.center_id,assigned_by_user=excluded.assigned_by_user,note=excluded.note,assigned_at=now(),updated_at=now();
  insert into public.request_team_assignments(request_id,team_id,assigned_by_user,note)
  values(p_request_id,p_team_id,v_user.id,nullif(trim(p_note),''))
  on conflict(request_id) do update set team_id=excluded.team_id,assigned_by_user=excluded.assigned_by_user,note=excluded.note,assigned_at=now(),updated_at=now();
  perform public.refresh_public_request(p_request_id);
end $$;

revoke all on function public.get_public_subcenters() from public,authenticated;
revoke all on function public.update_volunteer_by_session(text,uuid,jsonb) from public,authenticated;
revoke all on function public.delete_volunteer_by_session(text,uuid) from public,authenticated;
grant execute on function public.get_public_subcenters() to anon;
grant execute on function public.update_volunteer_by_session(text,uuid,jsonb) to anon;
grant execute on function public.delete_volunteer_by_session(text,uuid) to anon;

select 'migration-006-subcenter-team-management-ok' as result;
