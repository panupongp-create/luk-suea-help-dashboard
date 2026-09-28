-- An individual requesting help may not belong to an agency or school.
-- Keep both organization fields optional in the public request form.

alter table public.requests alter column coordinator_org drop not null;

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
     or nullif(trim(p_payload->>'coordinator_phone'),'') is null then
    raise exception 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน';
  end if;
  v_no:='REQ-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.request_number_seq')::text,5,'0');
  insert into public.requests(
    id,request_no,requester_type,requester_name,received_at,received_by,
    location_name,organization,operation_point,situation,impact,mission,
    personnel_required,operation_start_at,operation_end_at,priority,
    coordinator_name,coordinator_org,coordinator_phone,edit_token_hash
  ) values (
    v_id,v_no,v_requester_type,trim(p_payload->>'requester_name'),
    coalesce(nullif(p_payload->>'received_at','')::timestamptz,now()),trim(p_payload->>'received_by'),
    trim(p_payload->>'location_name'),nullif(trim(p_payload->>'organization'),''),
    nullif(trim(p_payload->>'operation_point'),''),trim(p_payload->>'situation'),
    nullif(trim(p_payload->>'impact'),''),trim(p_payload->>'mission'),
    (p_payload->>'personnel_required')::integer,(p_payload->>'operation_start_at')::timestamptz,
    nullif(p_payload->>'operation_end_at','')::timestamptz,
    coalesce(nullif(p_payload->>'priority',''),'normal')::public.request_priority,
    trim(p_payload->>'coordinator_name'),nullif(trim(p_payload->>'coordinator_org'),''),
    trim(p_payload->>'coordinator_phone'),extensions.digest(v_token,'sha256')
  );
  insert into public.workflow_steps(request_id,step_code,step_order,step_name,step_detail,status,action_at,completed_at) values
    (v_id,'received',1,'รับคำร้อง','รับและบันทึกข้อมูลคำร้องขอให้ครบถ้วน','completed',now(),now()),
    (v_id,'verified',2,'ตรวจสอบ','ตรวจสอบความครบถ้วนและยืนยันกับผู้ประสานงาน','pending',null,null),
    (v_id,'safety',3,'ประเมินความปลอดภัย','ประเมินความเสี่ยงของพื้นที่และภารกิจก่อนจัดส่งกำลัง','pending',null,null),
    (v_id,'team_type',4,'กำหนดประเภททีม','กำหนดชุดปฏิบัติการให้ตรงกับภารกิจที่ร้องขอ','pending',null,null),
    (v_id,'staffing',5,'จัดกำลัง','คัดเลือกและจัดจำนวนผู้ปฏิบัติงานตามภารกิจ พื้นที่ และช่วงเวลา','pending',null,null),
    (v_id,'leader_notified',6,'แจ้งหัวหน้าทีม','แจ้งสถานที่ ภารกิจ วันเวลา ผู้ประสานงาน และข้อควรระวัง','pending',null,null),
    (v_id,'operating',7,'เข้าปฏิบัติ','ชุดปฏิบัติการเข้าพื้นที่ตามภารกิจ','pending',null,null),
    (v_id,'reported',8,'รายงานผล','รายงานผล ปัญหา อุปสรรค และความต้องการเพิ่มเติม','pending',null,null);
  perform public.refresh_public_request(v_id);
  return query select v_id,v_no,v_token;
end $$;

revoke all on function public.create_public_request(jsonb) from public, authenticated;
grant execute on function public.create_public_request(jsonb) to anon;

select 'migration-011-optional-request-organization-ok' as result;
