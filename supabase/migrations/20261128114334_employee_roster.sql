alter table public.questions drop constraint if exists questions_question_type_check;
alter table public.questions add constraint questions_question_type_check
  check (question_type in ('SINGLE_CHOICE','IMAGE_CHOICE','MULTI_FILL_BLANK','TRUE_FALSE','SPOT_DIFFERENCE','ACTION_BUILDER'));

create table if not exists public.employee_roster (
  employee_code text primary key check (employee_code <> '' and employee_code = upper(btrim(employee_code))),
  source_number integer not null check (source_number > 0),
  full_name text not null check (btrim(full_name) <> ''),
  company_code text not null check (btrim(company_code) <> '')
);

create table if not exists public.quiz_employee_visits (
  id uuid primary key default gen_random_uuid(),
  verification_token uuid not null unique default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  employee_code text not null references public.employee_roster(employee_code),
  verified_at timestamptz not null default now()
);
create index if not exists quiz_employee_visits_employee_idx
  on public.quiz_employee_visits (campaign_id, employee_code, verified_at);
create index if not exists quiz_employee_visits_recent_idx
  on public.quiz_employee_visits (campaign_id, verified_at desc, id desc);

alter table public.employee_roster enable row level security;
alter table public.quiz_employee_visits enable row level security;
revoke all on public.employee_roster, public.quiz_employee_visits from public, anon, authenticated;

create or replace function public.import_employee_roster(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Employee roster is empty or invalid';
  end if;
  insert into public.employee_roster (employee_code, source_number, full_name, company_code)
  select upper(btrim(employee_code)), source_number, btrim(full_name), btrim(company_code)
  from jsonb_to_recordset(p_rows) as r(employee_code text, source_number integer, full_name text, company_code text)
  on conflict (employee_code) do update set
    source_number = excluded.source_number, full_name = excluded.full_name, company_code = excluded.company_code;
  get diagnostics v_count = row_count;

  insert into public.admin_audit_logs (actor_id, actor_email, action_type, target_id, changes_json)
  select id, coalesce(email, employee_code), 'IMPORT_EMPLOYEE_ROSTER', 'employee_roster',
    jsonb_build_object('count', v_count)
  from public.users_roles where auth_user_id = auth.uid();
  return v_count;
end;
$$;

create or replace function public.get_employee_progress(p_campaign_id uuid, p_after_code text default '')
returns table (
  employee_code text, full_name text, company_code text, first_verified_at timestamptz,
  status text, attempts integer, retries integer, score integer, total integer,
  duration_seconds integer, submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('admin', 'hr_viewer') then
    raise exception 'Reporting access required' using errcode = '42501';
  end if;
  return query
  select r.employee_code, r.full_name, r.company_code, visits.first_verified_at,
    case when latest.status = 'InProgress' then 'InProgress'
         when completed.id is not null then 'Completed' else 'NotStarted' end,
    totals.attempts, greatest(totals.attempts - 1, 0), completed.score,
    jsonb_array_length(completed.selected_questions_json), completed.duration_seconds, completed.submitted_at
  from (
    select e.* from public.employee_roster e
    where e.employee_code > p_after_code
    order by e.employee_code limit 500
  ) r
  left join lateral (
    select min(v.verified_at) as first_verified_at from public.quiz_employee_visits v
    where v.campaign_id = p_campaign_id and v.employee_code = r.employee_code
  ) visits on true
  left join lateral (
    select a.status from public.quiz_attempts a
    where a.campaign_id = p_campaign_id and a.employee_code = r.employee_code
    order by a.attempt_number desc, a.started_at desc limit 1
  ) latest on true
  left join lateral (
    select a.id, a.score, a.selected_questions_json, a.duration_seconds, a.submitted_at
    from public.quiz_attempts a
    where a.campaign_id = p_campaign_id and a.employee_code = r.employee_code and a.status = 'Completed'
    order by a.attempt_number desc, a.started_at desc limit 1
  ) completed on true
  cross join lateral (
    select count(*)::integer as attempts from public.quiz_attempts a
    where a.campaign_id = p_campaign_id and a.employee_code = r.employee_code
  ) totals
  order by r.employee_code;
end;
$$;

create or replace function public.get_employee_visit_log(p_campaign_id uuid, p_before timestamptz default null, p_before_id uuid default null)
returns table (id uuid, employee_code text, full_name text, verified_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('admin', 'hr_viewer') then
    raise exception 'Reporting access required' using errcode = '42501';
  end if;
  return query
  select v.id, v.employee_code, r.full_name, v.verified_at
  from public.quiz_employee_visits v
  join public.employee_roster r on r.employee_code = v.employee_code
  where v.campaign_id = p_campaign_id
    and (p_before is null or (v.verified_at, v.id) < (p_before, p_before_id))
  order by v.verified_at desc, v.id desc limit 50;
end;
$$;

revoke execute on function public.import_employee_roster(jsonb), public.get_employee_progress(uuid, text),
  public.get_employee_visit_log(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.import_employee_roster(jsonb), public.get_employee_progress(uuid, text),
  public.get_employee_visit_log(uuid, timestamptz, uuid) to authenticated;
