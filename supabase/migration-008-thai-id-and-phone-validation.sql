-- Migration 008: validate Thai citizen-ID check digits and numeric phone numbers.

create or replace function public.is_valid_thai_national_id(p_national_id text)
returns boolean
language sql immutable strict
set search_path=pg_catalog
as $$
  select case
    when p_national_id !~ '^[0-9]{13}$' then false
    else (
      select mod(11 - mod(sum(substring(p_national_id from idx for 1)::integer * (14-idx)),11),10)
             = substring(p_national_id from 13 for 1)::integer
      from generate_series(1,12) as digit_positions(idx)
    )
  end;
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
     or nullif(trim(p_payload->>'full_name'),'') is null
     or nullif(trim(p_payload->>'phone'),'') is null
     or nullif(trim(p_payload->>'operational_areas'),'') is null
     or nullif(trim(p_payload->>'skills'),'') is null
     or nullif(trim(p_payload->>'availability_details'),'') is null then
    raise exception 'กรุณากรอกข้อมูลทะเบียนและเลือกศูนย์ย่อยให้ครบถ้วน';
  end if;
  if not public.is_valid_thai_national_id(trim(p_payload->>'national_id')) then
    raise exception 'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลข 13 หลักและ Check Digit';
  end if;
  if trim(p_payload->>'phone') !~ '^[0-9]{9,10}$' then
    raise exception 'กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลข 9–10 หลัก เช่น 0812345678';
  end if;

  v_no:='VOL-'||to_char(now() at time zone 'Asia/Bangkok','YYYYMMDD')||'-'||lpad(nextval('public.volunteer_number_seq')::text,5,'0');
  insert into public.volunteers(id,registration_no,group_no,subcenter_id,scoutdd_id,national_id,full_name,organization_network,phone,operational_areas,skills,vehicle,equipment,availability_details,edit_token_hash)
  values(v_id,v_no,v_group,v_center_id,nullif(trim(p_payload->>'scoutdd_id'),''),trim(p_payload->>'national_id'),trim(p_payload->>'full_name'),v_center_name,trim(p_payload->>'phone'),trim(p_payload->>'operational_areas'),trim(p_payload->>'skills'),nullif(trim(p_payload->>'vehicle'),''),nullif(trim(p_payload->>'equipment'),''),trim(p_payload->>'availability_details'),extensions.digest(v_token,'sha256'));

  return query select v_id,v_no,v_token;
exception when unique_violation then
  raise exception 'เลขประจำตัวประชาชนนี้มีอยู่ในทะเบียนแล้ว';
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
  if v_center_name is null or v_group not between 1 and 6
     or nullif(trim(p_payload->>'national_id'),'') is null
     or nullif(trim(p_payload->>'full_name'),'') is null or nullif(trim(p_payload->>'phone'),'') is null
     or nullif(trim(p_payload->>'operational_areas'),'') is null or nullif(trim(p_payload->>'skills'),'') is null
     or nullif(trim(p_payload->>'availability_details'),'') is null then
    raise exception 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง';
  end if;
  if not public.is_valid_thai_national_id(trim(p_payload->>'national_id')) then
    raise exception 'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลข 13 หลักและ Check Digit';
  end if;
  if trim(p_payload->>'phone') !~ '^[0-9]{9,10}$' then
    raise exception 'กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลข 9–10 หลัก เช่น 0812345678';
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

revoke all on function public.is_valid_thai_national_id(text) from public,anon,authenticated;
revoke all on function public.register_public_volunteer(jsonb) from public,authenticated;
revoke all on function public.update_volunteer_by_session(text,uuid,jsonb) from public,authenticated;
grant execute on function public.register_public_volunteer(jsonb) to anon;
grant execute on function public.update_volunteer_by_session(text,uuid,jsonb) to anon;

select 'migration-008-thai-id-and-phone-validation-ok' as result;
