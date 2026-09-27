-- Run this file once in Supabase SQL Editor.
-- Public users can create requests and read only the sanitized dashboard table.
-- Raw contact data stays private. Updates require the unguessable management link.

create extension if not exists pgcrypto;

do $$ begin
  create type public.request_priority as enum ('normal','urgent','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workflow_status as enum ('pending','in_progress','blocked','completed');
exception when duplicate_object then null; end $$;

create sequence if not exists public.request_number_seq start 1;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  received_at timestamptz not null default now(),
  received_by text not null,
  location_name text not null,
  organization text,
  operation_point text,
  situation text not null,
  impact text,
  mission text not null,
  personnel_required integer not null check (personnel_required between 1 and 9999),
  operation_start_at timestamptz not null,
  operation_end_at timestamptz,
  priority public.request_priority not null default 'normal',
  coordinator_name text not null,
  coordinator_org text not null,
  coordinator_phone text not null,
  summary text,
  recorder_name text,
  recorder_position text,
  recorded_at timestamptz,
  edit_token_hash bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  step_code text not null,
  step_order smallint not null check (step_order between 1 and 8),
  step_name text not null,
  step_detail text not null,
  status public.workflow_status not null default 'pending',
  assignee text,
  note text,
  action_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(request_id, step_code),
  unique(request_id, step_order)
);

create table if not exists public.public_requests (
  id uuid primary key references public.requests(id) on delete cascade,
  request_no text not null,
  received_at timestamptz not null,
  location_name text not null,
  organization text,
  mission text not null,
  personnel_required integer not null,
  operation_start_at timestamptz not null,
  priority public.request_priority not null,
  overall_status public.workflow_status not null default 'pending',
  current_step text not null default 'รับคำร้อง',
  completed_steps smallint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_requests_received_at on public.requests(received_at desc);
create index if not exists idx_requests_operation_start on public.requests(operation_start_at);
create index if not exists idx_steps_request_order on public.workflow_steps(request_id,step_order);
create index if not exists idx_public_status on public.public_requests(overall_status,operation_start_at);

alter table public.requests enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.public_requests enable row level security;

revoke all on public.requests from anon, authenticated;
revoke all on public.workflow_steps from anon, authenticated;
revoke all on public.public_requests from anon, authenticated;
grant select on public.public_requests to anon, authenticated;

drop policy if exists "Public dashboard is readable" on public.public_requests;
create policy "Public dashboard is readable" on public.public_requests for select to anon, authenticated using (true);

create or replace function public.refresh_public_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_completed integer;
  v_status public.workflow_status;
  v_step text;
begin
  select count(*) filter (where status='completed'),
         case when bool_or(status='blocked') then 'blocked'::public.workflow_status
              when count(*) filter (where status='completed') >= 8 then 'completed'::public.workflow_status
              when bool_or(status='in_progress') or count(*) filter (where status='completed') > 0 then 'in_progress'::public.workflow_status
              else 'pending'::public.workflow_status end
    into v_completed,v_status
  from public.workflow_steps where request_id=p_request_id;

  select step_name into v_step from public.workflow_steps
   where request_id=p_request_id and status <> 'completed' order by step_order limit 1;
  if v_step is null then
    select step_name into v_step from public.workflow_steps where request_id=p_request_id order by step_order desc limit 1;
  end if;

  insert into public.public_requests(id,request_no,received_at,location_name,organization,mission,personnel_required,operation_start_at,priority,overall_status,current_step,completed_steps,updated_at)
  select r.id,r.request_no,r.received_at,r.location_name,r.organization,r.mission,r.personnel_required,r.operation_start_at,r.priority,
         coalesce(v_status,'pending'),coalesce(v_step,'รับคำร้อง'),coalesce(v_completed,0),now()
    from public.requests r where r.id=p_request_id
  on conflict(id) do update set
    request_no=excluded.request_no,received_at=excluded.received_at,location_name=excluded.location_name,
    organization=excluded.organization,mission=excluded.mission,personnel_required=excluded.personnel_required,
    operation_start_at=excluded.operation_start_at,priority=excluded.priority,overall_status=excluded.overall_status,
    current_step=excluded.current_step,completed_steps=excluded.completed_steps,updated_at=now();
end $$;

create or replace function public.trigger_refresh_public_request()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.refresh_public_request(coalesce(new.request_id,old.request_id));
  return coalesce(new,old);
end $$;

drop trigger if exists workflow_steps_refresh_public on public.workflow_steps;
create trigger workflow_steps_refresh_public after insert or update or delete on public.workflow_steps
for each row execute function public.trigger_refresh_public_request();

create or replace function public.create_public_request(p_payload jsonb)
returns table(request_id uuid,request_no text,edit_token text)
language plpgsql security definer set search_path=public as $$
declare
  v_id uuid:=gen_random_uuid();
  v_token text:=encode(extensions.gen_random_bytes(24),'hex');
  v_no text;
begin
  if nullif(trim(p_payload->>'received_by'),'') is null
     or nullif(trim(p_payload->>'location_name'),'') is null
     or nullif(trim(p_payload->>'situation'),'') is null
     or nullif(trim(p_payload->>'mission'),'') is null
     or nullif(trim(p_payload->>'coordinator_name'),'') is null
     or nullif(trim(p_payload->>'coordinator_org'),'') is null
     or nullif(trim(p_payload->>'coordinator_phone'),'') is null then
    raise exception 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน';
  end if;

  v_no:='REQ-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.request_number_seq')::text,5,'0');
  insert into public.requests(id,request_no,received_at,received_by,location_name,organization,operation_point,situation,impact,mission,personnel_required,operation_start_at,operation_end_at,priority,coordinator_name,coordinator_org,coordinator_phone,edit_token_hash)
  values(v_id,v_no,coalesce(nullif(p_payload->>'received_at','')::timestamptz,now()),trim(p_payload->>'received_by'),trim(p_payload->>'location_name'),nullif(trim(p_payload->>'organization'),''),nullif(trim(p_payload->>'operation_point'),''),trim(p_payload->>'situation'),nullif(trim(p_payload->>'impact'),''),trim(p_payload->>'mission'),(p_payload->>'personnel_required')::integer,(p_payload->>'operation_start_at')::timestamptz,nullif(p_payload->>'operation_end_at','')::timestamptz,coalesce(nullif(p_payload->>'priority',''),'normal')::public.request_priority,trim(p_payload->>'coordinator_name'),trim(p_payload->>'coordinator_org'),trim(p_payload->>'coordinator_phone'),extensions.digest(v_token,'sha256'));

  insert into public.workflow_steps(request_id,step_code,step_order,step_name,step_detail,status,action_at,completed_at)
  values
    (v_id,'received',1,'รับคำร้อง','รับและบันทึกข้อมูลคำร้องขอให้ครบถ้วน','completed',now(),now()),
    (v_id,'verified',2,'ตรวจสอบ','ตรวจสอบข้อมูลและยืนยันกับผู้ประสานงาน','pending',null,null),
    (v_id,'safety',3,'ประเมินความปลอดภัย','ประเมินความเสี่ยงของพื้นที่และภารกิจ','pending',null,null),
    (v_id,'team_type',4,'กำหนดประเภททีม','กำหนดชุดปฏิบัติการให้ตรงกับภารกิจ','pending',null,null),
    (v_id,'staffing',5,'จัดกำลัง','จัดจำนวนผู้ปฏิบัติงานตามภารกิจและช่วงเวลา','pending',null,null),
    (v_id,'leader_notified',6,'แจ้งหัวหน้าทีม','แจ้งสถานที่ ภารกิจ วันเวลา และข้อควรระวัง','pending',null,null),
    (v_id,'operating',7,'เข้าปฏิบัติ','ชุดปฏิบัติการเข้าพื้นที่ตามภารกิจ','pending',null,null),
    (v_id,'reported',8,'รายงานผล','รายงานผล ปัญหา อุปสรรค และความต้องการเพิ่มเติม','pending',null,null);
  perform public.refresh_public_request(v_id);
  return query select v_id,v_no,v_token;
end $$;

create or replace function public.get_request_by_token(p_request_id uuid,p_edit_token text)
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'request',to_jsonb(r)-'edit_token_hash',
    'steps',coalesce((select jsonb_agg(to_jsonb(s) order by s.step_order) from public.workflow_steps s where s.request_id=r.id),'[]'::jsonb)
  ) from public.requests r where r.id=p_request_id and r.edit_token_hash=extensions.digest(p_edit_token,'sha256');
$$;

create or replace function public.update_workflow_step_by_token(p_request_id uuid,p_edit_token text,p_step_code text,p_status text,p_assignee text,p_note text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.requests where id=p_request_id and edit_token_hash=extensions.digest(p_edit_token,'sha256')) then raise exception 'ลิงก์จัดการไม่ถูกต้อง'; end if;
  if p_status not in ('pending','in_progress','blocked','completed') then raise exception 'สถานะไม่ถูกต้อง'; end if;
  update public.workflow_steps set status=p_status::public.workflow_status,assignee=nullif(trim(p_assignee),''),note=nullif(trim(p_note),''),action_at=now(),completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,updated_at=now()
   where request_id=p_request_id and step_code=p_step_code;
  if not found then raise exception 'ไม่พบขั้นตอน'; end if;
  update public.requests set updated_at=now() where id=p_request_id;
end $$;

create or replace function public.update_request_summary_by_token(p_request_id uuid,p_edit_token text,p_summary text,p_recorder_name text,p_recorder_position text)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.requests set summary=nullif(trim(p_summary),''),recorder_name=nullif(trim(p_recorder_name),''),recorder_position=nullif(trim(p_recorder_position),''),recorded_at=now(),updated_at=now()
   where id=p_request_id and edit_token_hash=extensions.digest(p_edit_token,'sha256');
  if not found then raise exception 'ลิงก์จัดการไม่ถูกต้อง'; end if;
end $$;

revoke all on function public.create_public_request(jsonb) from public;
revoke all on function public.get_request_by_token(uuid,text) from public;
revoke all on function public.update_workflow_step_by_token(uuid,text,text,text,text,text) from public;
revoke all on function public.update_request_summary_by_token(uuid,text,text,text,text) from public;
revoke all on function public.refresh_public_request(uuid) from public;
revoke all on function public.trigger_refresh_public_request() from public;
grant execute on function public.create_public_request(jsonb) to anon,authenticated;
grant execute on function public.get_request_by_token(uuid,text) to anon,authenticated;
grant execute on function public.update_workflow_step_by_token(uuid,text,text,text,text,text) to anon,authenticated;
grant execute on function public.update_request_summary_by_token(uuid,text,text,text,text) to anon,authenticated;

do $$ begin
  alter publication supabase_realtime add table public.public_requests;
exception when duplicate_object then null; end $$;
