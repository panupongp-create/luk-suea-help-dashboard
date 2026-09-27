-- Migration 003: username/password login for central and subcenter staff
-- Public volunteer registration, public request intake and the public dashboard remain anonymous.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text not null,
  role text not null check (role in ('central','subcenter')),
  center_id uuid references public.subcenters(id),
  password_hash text not null,
  active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((role='central' and center_id is null) or (role='subcenter' and center_id is not null))
);

create unique index if not exists app_users_username_lower_key on public.app_users(lower(username));
create index if not exists idx_app_users_center on public.app_users(center_id) where active;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_app_sessions_user on public.app_sessions(user_id);
create index if not exists idx_app_sessions_expiry on public.app_sessions(expires_at);

alter table public.request_assignments add column if not exists assigned_by_user uuid references public.app_users(id);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
revoke all on public.app_users from anon,authenticated;
revoke all on public.app_sessions from anon,authenticated;

create or replace function public.require_staff_user(p_session_token text,p_required_role text default null)
returns public.app_users
language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_user_id uuid;
  v_session_id uuid;
begin
  select u.id,s.id into v_user_id,v_session_id
  from public.app_sessions s
  join public.app_users u on u.id=s.user_id
  where s.token_hash=extensions.digest(coalesce(p_session_token,''),'sha256')
    and s.expires_at>now()
    and u.active
  limit 1;

  if v_user_id is null then raise exception 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'; end if;
  select * into v_user from public.app_users where id=v_user_id;
  if p_required_role is not null and v_user.role<>p_required_role then raise exception 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้'; end if;

  update public.app_sessions set last_used_at=now() where id=v_session_id;
  return v_user;
end $$;

create or replace function public.login_staff(p_username text,p_password text)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_token text:=encode(extensions.gen_random_bytes(32),'hex');
  v_expires timestamptz:=now()+interval '24 hours';
  v_center_name text;
begin
  delete from public.app_sessions where expires_at<=now();

  select * into v_user from public.app_users
  where lower(username)=lower(trim(coalesce(p_username,''))) and active
  limit 1;

  if v_user.id is null then return jsonb_build_object('error','ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); end if;
  if v_user.locked_until is not null and v_user.locked_until>now() then
    return jsonb_build_object('error','บัญชีถูกพักชั่วคราว กรุณาลองใหม่ภายหลัง');
  end if;
  if v_user.password_hash<>extensions.crypt(coalesce(p_password,''),v_user.password_hash) then
    update public.app_users
    set failed_attempts=failed_attempts+1,
        locked_until=case when failed_attempts+1>=5 then now()+interval '15 minutes' else null end,
        updated_at=now()
    where id=v_user.id;
    return jsonb_build_object('error','ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  end if;

  update public.app_users set failed_attempts=0,locked_until=null,updated_at=now() where id=v_user.id;
  insert into public.app_sessions(user_id,token_hash,expires_at)
  values(v_user.id,extensions.digest(v_token,'sha256'),v_expires);
  select name into v_center_name from public.subcenters where id=v_user.center_id;

  return jsonb_build_object(
    'session_token',v_token,'expires_at',v_expires,
    'user_id',v_user.id,'username',v_user.username,'display_name',v_user.display_name,
    'role',v_user.role,'center_id',v_user.center_id,'center_name',v_center_name
  );
end $$;

create or replace function public.get_staff_session(p_session_token text)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_center_name text;
  v_expires timestamptz;
begin
  v_user:=public.require_staff_user(p_session_token,null);
  select name into v_center_name from public.subcenters where id=v_user.center_id;
  select expires_at into v_expires from public.app_sessions
  where user_id=v_user.id and token_hash=extensions.digest(coalesce(p_session_token,''),'sha256') limit 1;
  return jsonb_build_object(
    'expires_at',v_expires,'user_id',v_user.id,'username',v_user.username,
    'display_name',v_user.display_name,'role',v_user.role,
    'center_id',v_user.center_id,'center_name',v_center_name
  );
end $$;

create or replace function public.logout_staff(p_session_token text)
returns void
language sql security definer set search_path=public as $$
  delete from public.app_sessions
  where token_hash=extensions.digest(coalesce(p_session_token,''),'sha256');
$$;

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
    'requests',coalesce((select jsonb_agg(((to_jsonb(r)-'edit_token_hash') || jsonb_build_object('assigned_center_id',a.center_id,'assigned_center_name',c.name,'assignment_note',a.note)) order by r.received_at desc) from public.requests r left join public.request_assignments a on a.request_id=r.id left join public.subcenters c on c.id=a.center_id),'[]'::jsonb)
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
  v_user:=public.require_staff_user(p_session_token,'central');
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
    end if;
  end loop;
  if not exists(select 1 from public.operation_team_members tm where tm.team_id=v_id and tm.volunteer_id=v_leader) then
    insert into public.operation_team_members(team_id,volunteer_id,role,is_leader) values(v_id,v_leader,'หัวหน้าชุด',true);
  end if;
  return query select v_id,v_no;
end $$;

create or replace function public.assign_request_to_subcenter_by_session(p_session_token text,p_request_id uuid,p_center_id uuid,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  if not exists(select 1 from public.requests where id=p_request_id) then raise exception 'ไม่พบคำร้อง'; end if;
  if not exists(select 1 from public.subcenters where id=p_center_id and active) then raise exception 'ไม่พบศูนย์ย่อยหรือศูนย์ถูกปิดใช้งาน'; end if;
  insert into public.request_assignments(request_id,center_id,assigned_by_user,note)
  values(p_request_id,p_center_id,v_user.id,nullif(trim(p_note),''))
  on conflict(request_id) do update set center_id=excluded.center_id,assigned_by_user=excluded.assigned_by_user,note=excluded.note,assigned_at=now(),updated_at=now();
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
      'request',((to_jsonb(r)-'edit_token_hash') || jsonb_build_object('overall_status',pr.overall_status,'current_step',pr.current_step,'completed_steps',pr.completed_steps)),
      'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.step_order) from public.workflow_steps s where s.request_id=r.id),'[]'::jsonb)
    ) order by a.assigned_at desc) from public.request_assignments a join public.requests r on r.id=a.request_id left join public.public_requests pr on pr.id=r.id where a.center_id=v_user.center_id),'[]'::jsonb)
  );
end $$;

create or replace function public.update_workflow_step_by_staff(p_session_token text,p_request_id uuid,p_step_code text,p_status text,p_assignee text,p_note text)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'subcenter');
  if not exists(select 1 from public.request_assignments where request_id=p_request_id and center_id=v_user.center_id) then raise exception 'คำร้องนี้ไม่ได้มอบหมายให้ศูนย์ของท่าน'; end if;
  if p_status not in ('pending','in_progress','blocked','completed') then raise exception 'สถานะไม่ถูกต้อง'; end if;
  update public.workflow_steps set status=p_status::public.workflow_status,assignee=nullif(trim(p_assignee),''),note=nullif(trim(p_note),''),action_at=now(),completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,updated_at=now()
  where request_id=p_request_id and step_code=p_step_code;
  if not found then raise exception 'ไม่พบขั้นตอน'; end if;
  update public.requests set updated_at=now() where id=p_request_id;
end $$;

create or replace function public.update_request_summary_by_staff(p_session_token text,p_request_id uuid,p_summary text,p_recorder_name text,p_recorder_position text)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user:=public.require_staff_user(p_session_token,'subcenter');
  if not exists(select 1 from public.request_assignments where request_id=p_request_id and center_id=v_user.center_id) then raise exception 'คำร้องนี้ไม่ได้มอบหมายให้ศูนย์ของท่าน'; end if;
  update public.requests set summary=nullif(trim(p_summary),''),recorder_name=nullif(trim(p_recorder_name),''),recorder_position=nullif(trim(p_recorder_position),''),recorded_at=now(),updated_at=now() where id=p_request_id;
end $$;

create or replace function public.provision_initial_staff_accounts()
returns table(account_role text,center_name text,username text,temporary_password text)
language plpgsql security definer set search_path=public as $$
declare
  v_center_id uuid;
  v_password text;
  v_item record;
begin
  if session_user not in ('postgres','supabase_admin') then raise exception 'ฟังก์ชันนี้เรียกได้จาก SQL Editor โดยผู้ดูแลเท่านั้น'; end if;
  if exists(select 1 from public.app_users) then raise exception 'มีบัญชีเจ้าหน้าที่อยู่แล้ว ระบบจะไม่สร้างซ้ำหรือรีเซ็ตรหัสผ่าน'; end if;

  v_password:=encode(extensions.gen_random_bytes(12),'hex');
  insert into public.app_users(username,display_name,role,password_hash)
  values('central','ศูนย์ส่วนกลาง','central',extensions.crypt(v_password,extensions.gen_salt('bf',12)));
  account_role:='central'; center_name:='ศูนย์ส่วนกลาง'; username:='central'; temporary_password:=v_password; return next;

  for v_item in select * from (values
    ('SUB-01','ศูนย์ผินแจ่มวิชาสอน','phinjam'),
    ('SUB-02','ศูนย์พัฒนาบุคลากรทางการลูกเสือ ยุวกาชาดและกิจกรรมเยาวชน "กฐิน กุยยกานนท์"','kathin'),
    ('SUB-03','มัธยมวัดหนองจอก','nongchok'),
    ('SUB-04','วิทยาลัยเทคนิคดอนเมือง','donmueang')
  ) as centers(center_code,center_name,account_username)
  loop
    insert into public.subcenters(center_code,name,service_areas,notes,access_token_hash,active)
    values(v_item.center_code,v_item.center_name,'พื้นที่รับผิดชอบตามที่ศูนย์ส่วนกลางมอบหมาย','บัญชีศูนย์ย่อยที่กำหนดในระบบ',extensions.digest(encode(extensions.gen_random_bytes(32),'hex'),'sha256'),true)
    on conflict(center_code) do update set name=excluded.name,active=true,updated_at=now()
    returning id into v_center_id;

    v_password:=encode(extensions.gen_random_bytes(12),'hex');
    insert into public.app_users(username,display_name,role,center_id,password_hash)
    values(v_item.account_username,v_item.center_name,'subcenter',v_center_id,extensions.crypt(v_password,extensions.gen_salt('bf',12)));
    account_role:='subcenter'; center_name:=v_item.center_name; username:=v_item.account_username; temporary_password:=v_password; return next;
  end loop;
end $$;

revoke all on function public.require_staff_user(text,text) from public,anon,authenticated;
revoke all on function public.login_staff(text,text) from public,authenticated;
revoke all on function public.get_staff_session(text) from public,authenticated;
revoke all on function public.logout_staff(text) from public,authenticated;
revoke all on function public.get_central_workspace_by_session(text) from public,authenticated;
revoke all on function public.create_operation_team_by_session(text,jsonb) from public,authenticated;
revoke all on function public.assign_request_to_subcenter_by_session(text,uuid,uuid,text) from public,authenticated;
revoke all on function public.get_subcenter_workspace_by_session(text) from public,authenticated;
revoke all on function public.update_workflow_step_by_staff(text,uuid,text,text,text,text) from public,authenticated;
revoke all on function public.update_request_summary_by_staff(text,uuid,text,text,text) from public,authenticated;
revoke all on function public.provision_initial_staff_accounts() from public,anon,authenticated;

grant execute on function public.login_staff(text,text) to anon;
grant execute on function public.get_staff_session(text) to anon;
grant execute on function public.logout_staff(text) to anon;
grant execute on function public.get_central_workspace_by_session(text) to anon;
grant execute on function public.create_operation_team_by_session(text,jsonb) to anon;
grant execute on function public.assign_request_to_subcenter_by_session(text,uuid,uuid,text) to anon;
grant execute on function public.get_subcenter_workspace_by_session(text) to anon;
grant execute on function public.update_workflow_step_by_staff(text,uuid,text,text,text,text) to anon;
grant execute on function public.update_request_summary_by_staff(text,uuid,text,text,text) to anon;
grant execute on function public.provision_initial_staff_accounts() to postgres;
