-- Migration 009: allow staff to edit older registrations without changing legacy IDs.
-- New registrations and any changed ID or phone still follow migration 008 validation.

create or replace function public.update_volunteer_by_session(p_session_token text,p_volunteer_id uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_center_id uuid:=nullif(trim(p_payload->>'subcenter_id'),'')::uuid;
  v_center_name text;
  v_group smallint:=(p_payload->>'group_no')::smallint;
  v_current_national_id text;
  v_current_phone text;
  v_new_national_id text:=trim(p_payload->>'national_id');
  v_new_phone text:=trim(p_payload->>'phone');
begin
  v_user:=public.require_staff_user(p_session_token,'central');
  select c.name into v_center_name from public.subcenters c where c.id=v_center_id and c.active;
  select national_id,phone into v_current_national_id,v_current_phone
  from public.volunteers where id=p_volunteer_id;
  if not found then raise exception 'ไม่พบผู้ลงทะเบียน'; end if;

  if v_center_name is null or v_group not between 1 and 6
     or nullif(v_new_national_id,'') is null
     or nullif(trim(p_payload->>'full_name'),'') is null or nullif(v_new_phone,'') is null
     or nullif(trim(p_payload->>'operational_areas'),'') is null or nullif(trim(p_payload->>'skills'),'') is null
     or nullif(trim(p_payload->>'availability_details'),'') is null then
    raise exception 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง';
  end if;
  if v_new_national_id is distinct from v_current_national_id
     and not public.is_valid_thai_national_id(v_new_national_id) then
    raise exception 'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลข 13 หลักและ Check Digit';
  end if;
  if v_new_phone is distinct from v_current_phone and v_new_phone !~ '^[0-9]{9,10}$' then
    raise exception 'กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลข 9–10 หลัก เช่น 0812345678';
  end if;

  update public.volunteers set
    group_no=v_group,subcenter_id=v_center_id,organization_network=v_center_name,
    scoutdd_id=nullif(trim(p_payload->>'scoutdd_id'),''),national_id=v_new_national_id,
    full_name=trim(p_payload->>'full_name'),phone=v_new_phone,
    operational_areas=trim(p_payload->>'operational_areas'),skills=trim(p_payload->>'skills'),
    vehicle=nullif(trim(p_payload->>'vehicle'),''),equipment=nullif(trim(p_payload->>'equipment'),''),
    availability_details=trim(p_payload->>'availability_details'),active=coalesce((p_payload->>'active')::boolean,false),updated_at=now()
  where id=p_volunteer_id;
exception when unique_violation then
  raise exception 'เลขประจำตัวประชาชนนี้มีอยู่ในทะเบียนแล้ว';
end $$;

revoke all on function public.update_volunteer_by_session(text,uuid,jsonb) from public,authenticated;
grant execute on function public.update_volunteer_by_session(text,uuid,jsonb) to anon;

select 'migration-009-allow-editing-legacy-volunteers-ok' as result;
