-- Read-only export for the self-hosted PostgreSQL migration.
-- Run in Supabase SQL Editor, then Export -> Download CSV. The result is
-- deliberately one row so the editor's 100-row display limit cannot omit data.
-- The CSV contains personal data and password/session hashes: never commit it.
select jsonb_build_object(
  'format', 'luk-suea-snapshot-v1',
  'project_ref', 'cfwjnjyscpaorebgchsy',
  'exported_at', now(),
  'tables', jsonb_build_object(
    'subcenters', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.subcenters t),
    'app_users', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.app_users t),
    'app_sessions', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.app_sessions t),
    'central_access_keys', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.central_access_keys t),
    'volunteers', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.volunteers t),
    'operation_teams', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.operation_teams t),
    'operation_team_members', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.operation_team_members t),
    'requests', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.requests t),
    'workflow_steps', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.workflow_steps t),
    'public_requests', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.public_requests t),
    'request_assignments', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.request_assignments t),
    'request_team_assignments', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.request_team_assignments t),
    'shelter_residents', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.shelter_residents t)
  ),
  'sequences', jsonb_build_object(
    'request_number_seq', (select jsonb_build_object('last_value', last_value::text, 'is_called', is_called) from public.request_number_seq),
    'volunteer_number_seq', (select jsonb_build_object('last_value', last_value::text, 'is_called', is_called) from public.volunteer_number_seq),
    'team_number_seq', (select jsonb_build_object('last_value', last_value::text, 'is_called', is_called) from public.team_number_seq),
    'center_number_seq', (select jsonb_build_object('last_value', last_value::text, 'is_called', is_called) from public.center_number_seq)
  )
) as snapshot;
