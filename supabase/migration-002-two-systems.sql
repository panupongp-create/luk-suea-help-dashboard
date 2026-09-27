-- Migration 002: two-system workflow
-- 1) Volunteer/resource registry and central team assembly
-- 2) Public requests routed by the central office to private subcenter links

create extension if not exists pgcrypto;

alter table public.requests add column if not exists requester_type text not null default 'citizen';
alter table public.requests add column if not exists requester_name text;
do $$ begin
  alter table public.requests add constraint requests_requester_type_check check (requester_type in ('citizen','agency'));
exception when duplicate_object then null; end $$;

alter table public.public_requests add column if not exists assigned_center_name text;

create sequence if not exists public.volunteer_number_seq start 1;
create sequence if not exists public.team_number_seq start 1;
create sequence if not exists public.center_number_seq start 1;

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  registration_no text not null unique,
  group_no smallint not null check (group_no between 1 and 6),
  scoutdd_id text,
  national_id text not null unique check (national_id ~ '^[0-9]{13}$'),
  full_name text not null,
  organization_network text not null,
  phone text not null,
  operational_areas text not null,
  skills text not null,
  vehicle text,
  equipment text,
  availability_details text not null,
  active boolean not null default true,
  edit_token_hash bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_teams (
  id uuid primary key default gen_random_uuid(),
  team_no text not null unique,
  team_type text not null check (team_type in ('relief_packing','shelter_support','child_friendly','school_recovery')),
  leader_volunteer_id uuid not null references public.volunteers(id),
  operation_area text not null,
  operation_start_at timestamptz not null,
  operation_end_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_team_members (
  team_id uuid not null references public.operation_teams(id) on delete cascade,
  volunteer_id uuid not null references public.volunteers(id),
  role text,
  notes text,
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (team_id,volunteer_id)
);

create table if not exists public.subcenters (
  id uuid primary key default gen_random_uuid(),
  center_code text not null unique,
  name text not null,
  service_areas text not null,
  contact_name text,
  contact_phone text,
  notes text,
  access_token_hash bytea not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.central_access_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash bytea not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.request_assignments (
  request_id uuid primary key references public.requests(id) on delete cascade,
  center_id uuid not null references public.subcenters(id),
  assigned_by_key uuid references public.central_access_keys(id),
  note text,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_volunteers_group_active on public.volunteers(group_no,active);
create index if not exists idx_teams_start on public.operation_teams(operation_start_at desc);
create index if not exists idx_assignments_center on public.request_assignments(center_id,assigned_at desc);

alter table public.volunteers enable row level security;
alter table public.operation_teams enable row level security;
alter table public.operation_team_members enable row level security;
alter table public.subcenters enable row level security;
alter table public.central_access_keys enable row level security;
alter table public.request_assignments enable row level security;

revoke all on public.volunteers from anon,authenticated;
revoke all on public.operation_teams from anon,authenticated;
revoke all on public.operation_team_members from anon,authenticated;
revoke all on public.subcenters from anon,authenticated;
revoke all on public.central_access_keys from anon,authenticated;
revoke all on public.request_assignments from anon,authenticated;

create or replace function public.is_central_token(p_token text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.central_access_keys
    where active and token_hash=extensions.digest(coalesce(p_token,''),'sha256')
  );
$$;

create or replace function public.is_subcenter_token(p_center_id uuid,p_token text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.subcenters
    where id=p_center_id and active and access_token_hash=extensions.digest(coalesce(p_token,''),'sha256')
  );
$$;

create or replace function public.provision_central_access(p_label text default 'ศูนย์ส่วนกลาง')
returns text language plpgsql security definer set search_path=public as $$
declare
  v_token text:=encode(extensions.gen_random_bytes(32),'hex');
begin
  if session_user not in ('postgres','supabase_admin') then
    raise exception 'ฟังก์ชันนี้เรียกได้จาก SQL Editor โดยผู้ดูแลเท่านั้น';
  end if;
  insert into public.central_access_keys(label,token_hash)
  values(coalesce(nullif(trim(p_label),''),'ศูนย์ส่วนกลาง'),extensions.digest(v_token,'sha256'));
  return v_token;
end $$;

create or replace function public.register_public_volunteer(p_payload jsonb)
returns table(volunteer_id uuid,registration_no text,edit_token text)
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid();
  v_token text:=encode(extensions.gen_random_bytes(24),'hex');
  v_no text;
  v_group smallint;
begin
  v_group:=(p_payload->>'group_no')::smallint;
  if v_group not between 1 and 6
     or nullif(trim(p_payload->>'national_id'),'') is null
     or trim(p_payload->>'national_id') !~ '^[0-9]{13}$'
     or nullif(trim(p_payload->>'full_name'),'') is null
     or nullif(trim(p_payload->>'organization_network'),'') is null
     or nullif(trim(p_payload->>'phone'),'') is null
     or nullif(trim(p_payload->>'operational_areas'),'') is null
     or nullif(trim(p_payload->>'skills'),'') is null
     or nullif(trim(p_payload->>'availability_details'),'') is null then
    raise exception 'กรุณากรอกข้อมูลทะเบียนที่จำเป็นให้ครบถ้วน';
  end if;

  v_no:='VOL-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.volunteer_number_seq')::text,5,'0');
  insert into public.volunteers(id,registration_no,group_no,scoutdd_id,national_id,full_name,organization_network,phone,operational_areas,skills,vehicle,equipment,availability_details,edit_token_hash)
  values(v_id,v_no,v_group,nullif(trim(p_payload->>'scoutdd_id'),''),trim(p_payload->>'national_id'),trim(p_payload->>'full_name'),trim(p_payload->>'organization_network'),trim(p_payload->>'phone'),trim(p_payload->>'operational_areas'),trim(p_payload->>'skills'),nullif(trim(p_payload->>'vehicle'),''),nullif(trim(p_payload->>'equipment'),''),trim(p_payload->>'availability_details'),extensions.digest(v_token,'sha256'));

  return query select v_id,v_no,v_token;
exception when unique_violation then
  raise exception 'เลขประจำตัวประชาชนนี้มีอยู่ในทะเบียนแล้ว';
end $$;

create or replace function public.get_public_volunteer_stats()
returns table(group_no smallint,total bigint,available bigint)
language sql stable security definer set search_path=public as $$
  select groups.group_no::smallint,
         count(v.id)::bigint,
         count(v.id) filter (where v.active)::bigint
  from generate_series(1,6) groups(group_no)
  left join public.volunteers v on v.group_no=groups.group_no
  group by groups.group_no
  order by groups.group_no;
$$;

create or replace function public.create_operation_team(p_central_token text,p_payload jsonb)
returns table(team_id uuid,team_no text)
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid();
  v_no text;
  v_type text:=p_payload->>'team_type';
  v_leader uuid:=(p_payload->>'leader_volunteer_id')::uuid;
  v_member jsonb;
  v_count integer:=0;
begin
  if not public.is_central_token(p_central_token) then raise exception 'ลิงก์ศูนย์ส่วนกลางไม่ถูกต้อง'; end if;
  if v_type not in ('relief_packing','shelter_support','child_friendly','school_recovery') then raise exception 'ประเภทชุดไม่ถูกต้อง'; end if;
  if not exists(select 1 from public.volunteers where id=v_leader and active) then raise exception 'ไม่พบหัวหน้าชุดในทะเบียน'; end if;
  if nullif(trim(p_payload->>'operation_area'),'') is null or nullif(p_payload->>'operation_start_at','') is null then raise exception 'กรุณาระบุพื้นที่และวันปฏิบัติงาน'; end if;

  v_no:='TEAM-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.team_number_seq')::text,4,'0');
  insert into public.operation_teams(id,team_no,team_type,leader_volunteer_id,operation_area,operation_start_at,operation_end_at,notes)
  values(v_id,v_no,v_type,v_leader,trim(p_payload->>'operation_area'),(p_payload->>'operation_start_at')::timestamptz,nullif(p_payload->>'operation_end_at','')::timestamptz,nullif(trim(p_payload->>'notes'),''));

  for v_member in select value from jsonb_array_elements(coalesce(p_payload->'members','[]'::jsonb)) loop
    if exists(select 1 from public.volunteers where id=(v_member->>'volunteer_id')::uuid and active) then
      insert into public.operation_team_members(team_id,volunteer_id,role,notes,is_leader)
      values(v_id,(v_member->>'volunteer_id')::uuid,nullif(trim(v_member->>'role'),''),nullif(trim(v_member->>'notes'),''),(v_member->>'volunteer_id')::uuid=v_leader)
      on conflict on constraint operation_team_members_pkey do update set role=excluded.role,notes=excluded.notes,is_leader=excluded.is_leader;
      v_count:=v_count+1;
    end if;
  end loop;

  if not exists(select 1 from public.operation_team_members tm where tm.team_id=v_id and tm.volunteer_id=v_leader) then
    insert into public.operation_team_members(team_id,volunteer_id,role,is_leader) values(v_id,v_leader,'หัวหน้าชุด',true);
  end if;
  return query select v_id,v_no;
end $$;

create or replace function public.create_subcenter(p_central_token text,p_payload jsonb)
returns table(center_id uuid,center_code text,access_token text)
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid();
  v_code text;
  v_token text:=encode(extensions.gen_random_bytes(32),'hex');
begin
  if not public.is_central_token(p_central_token) then raise exception 'ลิงก์ศูนย์ส่วนกลางไม่ถูกต้อง'; end if;
  if nullif(trim(p_payload->>'name'),'') is null or nullif(trim(p_payload->>'service_areas'),'') is null then raise exception 'กรุณาระบุชื่อและพื้นที่รับผิดชอบ'; end if;
  v_code:='CTR-'||lpad(nextval('public.center_number_seq')::text,4,'0');
  insert into public.subcenters(id,center_code,name,service_areas,contact_name,contact_phone,notes,access_token_hash)
  values(v_id,v_code,trim(p_payload->>'name'),trim(p_payload->>'service_areas'),nullif(trim(p_payload->>'contact_name'),''),nullif(trim(p_payload->>'contact_phone'),''),nullif(trim(p_payload->>'notes'),''),extensions.digest(v_token,'sha256'));
  return query select v_id,v_code,v_token;
end $$;

create or replace function public.assign_request_to_subcenter(p_central_token text,p_request_id uuid,p_center_id uuid,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_key_id uuid;
begin
  select id into v_key_id from public.central_access_keys where active and token_hash=extensions.digest(coalesce(p_central_token,''),'sha256') limit 1;
  if v_key_id is null then raise exception 'ลิงก์ศูนย์ส่วนกลางไม่ถูกต้อง'; end if;
  if not exists(select 1 from public.requests where id=p_request_id) then raise exception 'ไม่พบคำร้อง'; end if;
  if not exists(select 1 from public.subcenters where id=p_center_id and active) then raise exception 'ไม่พบศูนย์ย่อยหรือศูนย์ถูกปิดใช้งาน'; end if;
  insert into public.request_assignments(request_id,center_id,assigned_by_key,note)
  values(p_request_id,p_center_id,v_key_id,nullif(trim(p_note),''))
  on conflict(request_id) do update set center_id=excluded.center_id,assigned_by_key=excluded.assigned_by_key,note=excluded.note,assigned_at=now(),updated_at=now();
  perform public.refresh_public_request(p_request_id);
end $$;

create or replace function public.get_central_workspace(p_central_token text)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when public.is_central_token(p_central_token) then jsonb_build_object(
    'label',(select label from public.central_access_keys where active and token_hash=extensions.digest(p_central_token,'sha256') limit 1),
    'volunteers',coalesce((select jsonb_agg(to_jsonb(v)-'edit_token_hash' order by v.created_at desc) from public.volunteers v),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(to_jsonb(team_data) order by team_data.operation_start_at desc) from (
      select t.id,t.team_no,t.team_type,t.operation_area,t.operation_start_at,t.operation_end_at,t.notes,t.created_at,
             leader.full_name as leader_name,
             (select count(*) from public.operation_team_members tm where tm.team_id=t.id) as member_count,
             coalesce((select jsonb_agg(jsonb_build_object('volunteer_id',tm.volunteer_id,'full_name',v.full_name,'role',tm.role,'notes',tm.notes,'is_leader',tm.is_leader) order by tm.is_leader desc,v.full_name) from public.operation_team_members tm join public.volunteers v on v.id=tm.volunteer_id where tm.team_id=t.id),'[]'::jsonb) as members
      from public.operation_teams t join public.volunteers leader on leader.id=t.leader_volunteer_id
    ) team_data),'[]'::jsonb),
    'centers',coalesce((select jsonb_agg(to_jsonb(c)-'access_token_hash' order by c.created_at desc) from public.subcenters c),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(((to_jsonb(r)-'edit_token_hash') || jsonb_build_object('assigned_center_id',a.center_id,'assigned_center_name',c.name,'assignment_note',a.note)) order by r.received_at desc) from public.requests r left join public.request_assignments a on a.request_id=r.id left join public.subcenters c on c.id=a.center_id),'[]'::jsonb)
  ) else null end;
$$;

create or replace function public.get_subcenter_workspace(p_center_id uuid,p_access_token text)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when public.is_subcenter_token(p_center_id,p_access_token) then jsonb_build_object(
    'center',(select to_jsonb(c)-'access_token_hash' from public.subcenters c where c.id=p_center_id),
    'requests',coalesce((select jsonb_agg(jsonb_build_object(
      'request',((to_jsonb(r)-'edit_token_hash') || jsonb_build_object('overall_status',pr.overall_status,'current_step',pr.current_step,'completed_steps',pr.completed_steps)),
      'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.step_order) from public.workflow_steps s where s.request_id=r.id),'[]'::jsonb)
    ) order by a.assigned_at desc) from public.request_assignments a join public.requests r on r.id=a.request_id left join public.public_requests pr on pr.id=r.id where a.center_id=p_center_id),'[]'::jsonb)
  ) else null end;
$$;

create or replace function public.update_workflow_step_by_subcenter(p_center_id uuid,p_access_token text,p_request_id uuid,p_step_code text,p_status text,p_assignee text,p_note text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_subcenter_token(p_center_id,p_access_token) then raise exception 'ลิงก์ศูนย์ย่อยไม่ถูกต้อง'; end if;
  if not exists(select 1 from public.request_assignments where request_id=p_request_id and center_id=p_center_id) then raise exception 'คำร้องนี้ไม่ได้มอบหมายให้ศูนย์ของท่าน'; end if;
  if p_status not in ('pending','in_progress','blocked','completed') then raise exception 'สถานะไม่ถูกต้อง'; end if;
  update public.workflow_steps set status=p_status::public.workflow_status,assignee=nullif(trim(p_assignee),''),note=nullif(trim(p_note),''),action_at=now(),completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,updated_at=now()
  where request_id=p_request_id and step_code=p_step_code;
  if not found then raise exception 'ไม่พบขั้นตอน'; end if;
  update public.requests set updated_at=now() where id=p_request_id;
end $$;

create or replace function public.update_request_summary_by_subcenter(p_center_id uuid,p_access_token text,p_request_id uuid,p_summary text,p_recorder_name text,p_recorder_position text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_subcenter_token(p_center_id,p_access_token) then raise exception 'ลิงก์ศูนย์ย่อยไม่ถูกต้อง'; end if;
  if not exists(select 1 from public.request_assignments where request_id=p_request_id and center_id=p_center_id) then raise exception 'คำร้องนี้ไม่ได้มอบหมายให้ศูนย์ของท่าน'; end if;
  update public.requests set summary=nullif(trim(p_summary),''),recorder_name=nullif(trim(p_recorder_name),''),recorder_position=nullif(trim(p_recorder_position),''),recorded_at=now(),updated_at=now() where id=p_request_id;
end $$;

create or replace function public.refresh_public_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_completed integer;
  v_status public.workflow_status;
  v_step text;
  v_center_name text;
begin
  select count(*) filter (where status='completed'),
         case when bool_or(status='blocked') then 'blocked'::public.workflow_status
              when count(*) filter (where status='completed') >= 8 then 'completed'::public.workflow_status
              when bool_or(status='in_progress') or count(*) filter (where status='completed') > 0 then 'in_progress'::public.workflow_status
              else 'pending'::public.workflow_status end
    into v_completed,v_status from public.workflow_steps where request_id=p_request_id;
  select step_name into v_step from public.workflow_steps where request_id=p_request_id and status<>'completed' order by step_order limit 1;
  if v_step is null then select step_name into v_step from public.workflow_steps where request_id=p_request_id order by step_order desc limit 1; end if;
  select c.name into v_center_name from public.request_assignments a join public.subcenters c on c.id=a.center_id where a.request_id=p_request_id;

  insert into public.public_requests(id,request_no,received_at,location_name,organization,mission,personnel_required,operation_start_at,priority,overall_status,current_step,completed_steps,assigned_center_name,updated_at)
  select r.id,r.request_no,r.received_at,r.location_name,r.organization,r.mission,r.personnel_required,r.operation_start_at,r.priority,coalesce(v_status,'pending'),coalesce(v_step,'รับคำร้อง'),coalesce(v_completed,0),v_center_name,now() from public.requests r where r.id=p_request_id
  on conflict(id) do update set request_no=excluded.request_no,received_at=excluded.received_at,location_name=excluded.location_name,organization=excluded.organization,mission=excluded.mission,personnel_required=excluded.personnel_required,operation_start_at=excluded.operation_start_at,priority=excluded.priority,overall_status=excluded.overall_status,current_step=excluded.current_step,completed_steps=excluded.completed_steps,assigned_center_name=excluded.assigned_center_name,updated_at=now();
end $$;

create or replace function public.create_public_request(p_payload jsonb)
returns table(request_id uuid,request_no text,edit_token text)
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid();
  v_token text:=encode(extensions.gen_random_bytes(24),'hex');
  v_no text;
  v_requester_type text:=coalesce(nullif(p_payload->>'requester_type',''),'citizen');
begin
  if v_requester_type not in ('citizen','agency')
     or nullif(trim(p_payload->>'requester_name'),'') is null
     or nullif(trim(p_payload->>'received_by'),'') is null
     or nullif(trim(p_payload->>'location_name'),'') is null
     or nullif(trim(p_payload->>'situation'),'') is null
     or nullif(trim(p_payload->>'mission'),'') is null
     or nullif(trim(p_payload->>'coordinator_name'),'') is null
     or nullif(trim(p_payload->>'coordinator_org'),'') is null
     or nullif(trim(p_payload->>'coordinator_phone'),'') is null then
    raise exception 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน';
  end if;
  v_no:='REQ-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.request_number_seq')::text,5,'0');
  insert into public.requests(id,request_no,requester_type,requester_name,received_at,received_by,location_name,organization,operation_point,situation,impact,mission,personnel_required,operation_start_at,operation_end_at,priority,coordinator_name,coordinator_org,coordinator_phone,edit_token_hash)
  values(v_id,v_no,v_requester_type,trim(p_payload->>'requester_name'),coalesce(nullif(p_payload->>'received_at','')::timestamptz,now()),trim(p_payload->>'received_by'),trim(p_payload->>'location_name'),nullif(trim(p_payload->>'organization'),''),nullif(trim(p_payload->>'operation_point'),''),trim(p_payload->>'situation'),nullif(trim(p_payload->>'impact'),''),trim(p_payload->>'mission'),(p_payload->>'personnel_required')::integer,(p_payload->>'operation_start_at')::timestamptz,nullif(p_payload->>'operation_end_at','')::timestamptz,coalesce(nullif(p_payload->>'priority',''),'normal')::public.request_priority,trim(p_payload->>'coordinator_name'),trim(p_payload->>'coordinator_org'),trim(p_payload->>'coordinator_phone'),extensions.digest(v_token,'sha256'));
  insert into public.workflow_steps(request_id,step_code,step_order,step_name,step_detail,status,action_at,completed_at) values
    (v_id,'received',1,'รับคำร้อง','รับและบันทึกข้อมูลคำร้องขอให้ครบถ้วน','completed',now(),now()),
    (v_id,'verified',2,'ตรวจสอบ','ตรวจสอบความครบถ้วนและยืนยันกับผู้ประสานงาน','pending',null,null),
    (v_id,'safety',3,'ประเมินความปลอดภัย','ประเมินความเสี่ยงของพื้นที่และภารกิจก่อนจัดส่งกำลัง','pending',null,null),
    (v_id,'team_type',4,'กำหนดประเภททีม','กำหนดชุดปฏิบัติการให้ตรงกับภารกิจที่ร้องขอ','pending',null,null),
    (v_id,'staffing',5,'จัดกำลัง','คัดเลือกและจัดจำนวนผู้ปฏิบัติงานตามภารกิจ พื้นที่ และช่วงเวลา','pending',null,null),
    (v_id,'leader_notified',6,'แจ้งหัวหน้าทีม','แจ้งสถานที่ ภารกิจ วันเวลา ผู้ประสานงาน และข้อควรระวัง','pending',null,null),
    (v_id,'operating',7,'เข้าปฏิบัติ','ชุดปฏิบัติการเข้าพื้นที่ตามภารกิจที่ได้รับมอบหมาย','pending',null,null),
    (v_id,'reported',8,'รายงานผล','รายงานผล ปัญหา อุปสรรค และความต้องการเพิ่มเติม','pending',null,null);
  perform public.refresh_public_request(v_id);
  return query select v_id,v_no,v_token;
end $$;

revoke all on function public.is_central_token(text) from public,anon,authenticated;
revoke all on function public.is_subcenter_token(uuid,text) from public,anon,authenticated;
revoke all on function public.provision_central_access(text) from public,anon,authenticated;
revoke all on function public.register_public_volunteer(jsonb) from public,authenticated;
revoke all on function public.get_public_volunteer_stats() from public,authenticated;
revoke all on function public.create_operation_team(text,jsonb) from public,authenticated;
revoke all on function public.create_subcenter(text,jsonb) from public,authenticated;
revoke all on function public.assign_request_to_subcenter(text,uuid,uuid,text) from public,authenticated;
revoke all on function public.get_central_workspace(text) from public,authenticated;
revoke all on function public.get_subcenter_workspace(uuid,text) from public,authenticated;
revoke all on function public.update_workflow_step_by_subcenter(uuid,text,uuid,text,text,text,text) from public,authenticated;
revoke all on function public.update_request_summary_by_subcenter(uuid,text,uuid,text,text,text) from public,authenticated;

grant execute on function public.register_public_volunteer(jsonb) to anon;
grant execute on function public.get_public_volunteer_stats() to anon;
grant execute on function public.create_operation_team(text,jsonb) to anon;
grant execute on function public.create_subcenter(text,jsonb) to anon;
grant execute on function public.assign_request_to_subcenter(text,uuid,uuid,text) to anon;
grant execute on function public.get_central_workspace(text) to anon;
grant execute on function public.get_subcenter_workspace(uuid,text) to anon;
grant execute on function public.update_workflow_step_by_subcenter(uuid,text,uuid,text,text,text,text) to anon;
grant execute on function public.update_request_summary_by_subcenter(uuid,text,uuid,text,text,text) to anon;

grant execute on function public.provision_central_access(text) to postgres;
