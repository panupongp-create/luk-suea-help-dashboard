-- Shelter resident records are private to the subcenter that created them.
-- No direct table access or public dashboard publication is granted.

create table if not exists public.shelter_residents (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.subcenters(id),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  address text not null check (char_length(btrim(address)) between 1 and 1000),
  phone text not null check (phone ~ '^[0-9]{9,10}$'),
  companions_count integer not null default 0 check (companions_count between 0 and 1000),
  emergency_contact_name text not null check (char_length(btrim(emergency_contact_name)) between 1 and 160),
  emergency_contact_phone text not null check (emergency_contact_phone ~ '^[0-9]{9,10}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shelter_residents_center_created
  on public.shelter_residents(center_id, created_at desc);

alter table public.shelter_residents enable row level security;
revoke all on public.shelter_residents from public, anon, authenticated;

create or replace function public.get_shelter_residents_by_session(p_session_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
begin
  v_user := public.require_staff_user(p_session_token, 'subcenter');
  if not exists (select 1 from public.subcenters where id=v_user.center_id and active) then
    raise exception 'ศูนย์ย่อยนี้ไม่พร้อมใช้งาน';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc)
    from public.shelter_residents r
    where r.center_id=v_user.center_id
  ), '[]'::jsonb);
end $$;

create or replace function public.save_shelter_resident_by_session(
  p_session_token text, p_payload jsonb, p_resident_id uuid default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_user public.app_users;
  v_id uuid;
  v_full_name text := btrim(p_payload->>'full_name');
  v_address text := btrim(p_payload->>'address');
  v_phone text := btrim(p_payload->>'phone');
  v_companions integer := nullif(btrim(p_payload->>'companions_count'),'')::integer;
  v_emergency_name text := btrim(p_payload->>'emergency_contact_name');
  v_emergency_phone text := btrim(p_payload->>'emergency_contact_phone');
begin
  v_user := public.require_staff_user(p_session_token, 'subcenter');
  if not exists (select 1 from public.subcenters where id=v_user.center_id and active) then
    raise exception 'ศูนย์ย่อยนี้ไม่พร้อมใช้งาน';
  end if;
  if nullif(v_full_name,'') is null or char_length(v_full_name)>160
     or nullif(v_address,'') is null or char_length(v_address)>1000
     or coalesce(v_phone,'') !~ '^[0-9]{9,10}$'
     or v_companions is null or v_companions not between 0 and 1000
     or nullif(v_emergency_name,'') is null or char_length(v_emergency_name)>160
     or coalesce(v_emergency_phone,'') !~ '^[0-9]{9,10}$' then
    raise exception 'กรุณาตรวจสอบข้อมูลผู้พักพิง เบอร์โทรศัพท์ และจำนวนผู้เข้าพักร่วม';
  end if;

  if p_resident_id is null then
    insert into public.shelter_residents (
      center_id,full_name,address,phone,companions_count,emergency_contact_name,emergency_contact_phone
    ) values (
      v_user.center_id,v_full_name,v_address,v_phone,v_companions,v_emergency_name,v_emergency_phone
    ) returning id into v_id;
  else
    update public.shelter_residents set
      full_name=v_full_name,address=v_address,phone=v_phone,companions_count=v_companions,
      emergency_contact_name=v_emergency_name,emergency_contact_phone=v_emergency_phone,updated_at=now()
    where id=p_resident_id and center_id=v_user.center_id
    returning id into v_id;
    if v_id is null then raise exception 'ไม่พบข้อมูลผู้พักพิงของศูนย์นี้'; end if;
  end if;
  return v_id;
end $$;

revoke all on function public.get_shelter_residents_by_session(text) from public, authenticated;
revoke all on function public.save_shelter_resident_by_session(text,jsonb,uuid) from public, authenticated;
grant execute on function public.get_shelter_residents_by_session(text) to anon;
grant execute on function public.save_shelter_resident_by_session(text,jsonb,uuid) to anon;

select 'migration-010-shelter-residents-ok' as result;
