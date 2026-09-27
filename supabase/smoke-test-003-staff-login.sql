begin;

do $$
declare
  v_center_id uuid:=gen_random_uuid();
  v_central_login jsonb;
  v_subcenter_login jsonb;
  v_central_token text;
  v_subcenter_token text;
  v_request record;
  v_workspace jsonb;
begin
  insert into public.subcenters(id,center_code,name,service_areas,access_token_hash)
  values(v_center_id,'SMOKE-LOGIN','ศูนย์ทดสอบ Login','พื้นที่ทดสอบ',extensions.digest('smoke-legacy-token','sha256'));

  insert into public.app_users(username,display_name,role,password_hash)
  values('smoke-central','ส่วนกลางทดสอบ','central',extensions.crypt('SmokePass!123',extensions.gen_salt('bf',12)));

  insert into public.app_users(username,display_name,role,center_id,password_hash)
  values('smoke-subcenter','ศูนย์ย่อยทดสอบ','subcenter',v_center_id,extensions.crypt('SmokePass!123',extensions.gen_salt('bf',12)));

  v_central_login:=public.login_staff('smoke-central','SmokePass!123');
  v_central_token:=v_central_login->>'session_token';
  if v_central_token is null then raise exception 'central login failed: %',v_central_login; end if;

  v_workspace:=public.get_central_workspace_by_session(v_central_token);
  if v_workspace is null or v_workspace->>'label'<>'ส่วนกลางทดสอบ' then raise exception 'central workspace failed'; end if;

  select * into v_request from public.create_public_request(jsonb_build_object(
    'requester_type','agency','requester_name','หน่วยงานทดสอบ','received_by','ระบบทดสอบ',
    'location_name','พื้นที่ทดสอบ','situation','สถานการณ์ทดสอบ','mission','ภารกิจทดสอบ',
    'personnel_required',3,'operation_start_at',(now()+interval '1 day')::text,
    'coordinator_name','ผู้ประสานงานทดสอบ','coordinator_org','หน่วยงานทดสอบ','coordinator_phone','0800000000'
  ));
  perform public.assign_request_to_subcenter_by_session(v_central_token,v_request.request_id,v_center_id,'มอบหมายทดสอบ');

  v_subcenter_login:=public.login_staff('smoke-subcenter','SmokePass!123');
  v_subcenter_token:=v_subcenter_login->>'session_token';
  if v_subcenter_token is null then raise exception 'subcenter login failed: %',v_subcenter_login; end if;

  v_workspace:=public.get_subcenter_workspace_by_session(v_subcenter_token);
  if jsonb_array_length(v_workspace->'requests')<>1 then raise exception 'subcenter workspace failed: %',v_workspace; end if;

  perform public.update_workflow_step_by_staff(v_subcenter_token,v_request.request_id,'verified','completed','เจ้าหน้าที่ทดสอบ','ตรวจสอบแล้ว');
  perform public.update_request_summary_by_staff(v_subcenter_token,v_request.request_id,'สรุปผลทดสอบ','เจ้าหน้าที่ทดสอบ','ผู้ทดสอบ');
  perform public.logout_staff(v_subcenter_token);

  if (public.login_staff('smoke-central','wrong-password')->>'error') is null then raise exception 'invalid password guard failed'; end if;
end $$;

rollback;
