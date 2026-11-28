-- Allow the designated tester to start another attempt after submitting.
-- Existing drafts still resume, and all other employee codes retain the one-attempt limit.

create or replace function public.enforce_single_quiz_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_code text := upper(btrim(new.employee_code));
begin
  perform pg_advisory_xact_lock(hashtext('mmv:one-attempt'), hashtext(v_code));
  if v_code <> '24040025' and exists (select 1 from public.quiz_attempts a where upper(btrim(a.employee_code)) = v_code) then
    raise exception 'ATTEMPT_USED';
  end if;
  return new;
end;
$$;

create or replace function public.genba_verify_employee(p_employee_code text, p_verify_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employee_roster%rowtype;
  v_campaign public.campaigns%rowtype;
  v_token uuid;
begin
  select * into v_employee from public.employee_roster where employee_code = upper(btrim(p_employee_code));
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Mã nhân viên không có trong danh sách.');
  end if;

  select * into v_campaign from public.campaigns where status = 'Active' order by created_at desc, id desc limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Hiện chưa có đợt khảo sát nào đang mở.');
  end if;

  insert into public.quiz_employee_visits (campaign_id, employee_code)
  values (v_campaign.id, v_employee.employee_code)
  returning verification_token into v_token;

  return jsonb_build_object(
    'ok', true, 'verification_token', v_token,
    'user', jsonb_build_object('employee_code', v_employee.employee_code, 'full_name', v_employee.full_name,
      'department', v_employee.company_code, 'employee_type', 'Office'),
    'campaign', to_jsonb(v_campaign) - 'google_sheet_webhook',
    'completed_attempts', case when v_employee.employee_code = '24040025' then 0 else
      (select count(*) from public.quiz_attempts
        where upper(btrim(employee_code)) = v_employee.employee_code and status = 'Completed')
      end,
    'attempt_unavailable', v_employee.employee_code <> '24040025'
      and coalesce((select a.status <> 'InProgress' or a.campaign_id <> v_campaign.id
        from public.quiz_attempts a where upper(btrim(a.employee_code)) = v_employee.employee_code
        order by a.started_at, a.id limit 1), false),
    'in_progress_attempt_id', (select id from public.quiz_attempts
      where campaign_id = v_campaign.id and upper(btrim(employee_code)) = v_employee.employee_code and status = 'InProgress'
      order by started_at, id limit 1)
  );
end;
$$;

create or replace function public.answer_verified_quiz_question(
  p_attempt_id uuid, p_attempt_token uuid, p_question_code text, p_answer jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_question public.questions%rowtype;
  v_next text;
  v_keys jsonb;
  v_feedback jsonb;
begin
  select * into v_attempt from public.quiz_attempts a
  where a.id = p_attempt_id and a.attempt_token = p_attempt_token for update;
  if not found then raise exception 'INVALID_ATTEMPT'; end if;
  if v_attempt.question_feedback_json ? p_question_code then
    return v_attempt.question_feedback_json->p_question_code;
  end if;
  if v_attempt.status <> 'InProgress' or (
    upper(btrim(v_attempt.employee_code)) <> '24040025' and exists (
      select 1 from public.quiz_attempts a
      where upper(btrim(a.employee_code)) = upper(btrim(v_attempt.employee_code))
        and a.id <> v_attempt.id
        and (a.status = 'Completed' or (a.started_at, a.id) < (v_attempt.started_at, v_attempt.id))
    )
  ) then raise exception 'ATTEMPT_USED'; end if;

  select code into v_next
  from jsonb_array_elements_text(v_attempt.selected_questions_json) with ordinality as q(code, idx)
  where not (v_attempt.question_feedback_json ? code)
  order by idx limit 1;
  if v_next is null or v_next is distinct from p_question_code then raise exception 'QUESTION_OUT_OF_ORDER'; end if;
  select * into v_question from public.questions where question_code = v_next;
  if not found then raise exception 'QUESTION_UNAVAILABLE'; end if;

  v_keys := v_question.correct_answer_json->'keys';
  if jsonb_typeof(v_keys) is distinct from 'array' then raise exception 'QUESTION_UNAVAILABLE'; end if;
  if jsonb_typeof(p_answer) is distinct from 'array' then raise exception 'INVALID_ANSWER'; end if;
  if jsonb_array_length(p_answer) = 0 or jsonb_array_length(p_answer) <> jsonb_array_length(v_keys)
    or (select count(distinct k) from jsonb_array_elements_text(p_answer) as a(k)) <> jsonb_array_length(p_answer)
    or exists (
      select 1 from jsonb_array_elements_text(p_answer) as a(k)
      where not exists (select 1 from jsonb_array_elements(v_question.options_json) opt where opt->>'key' = a.k)
    ) then raise exception 'INVALID_ANSWER'; end if;

  v_feedback := jsonb_build_object(
    'question_code', v_next, 'stage', v_question.stage, 'concept', v_question.concept,
    'prompt_text', v_question.prompt_text, 'options_json', v_question.options_json,
    'user_answer', p_answer, 'correct_answer', v_keys, 'explanation', v_question.explanation,
    'is_correct', case when v_question.question_type = 'ACTION_BUILDER'
      then p_answer @> v_keys and v_keys @> p_answer else p_answer = v_keys end
  );
  update public.quiz_attempts set question_feedback_json = question_feedback_json || jsonb_build_object(v_next, v_feedback)
  where id = p_attempt_id;
  return v_feedback;
end;
$$;

create or replace function public.submit_quiz_attempt(
  p_attempt_id uuid, p_attempt_token uuid, p_events jsonb, p_final_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_min_seconds integer;
  v_total integer;
  v_score integer;
  v_by_stage jsonb;
  v_duration integer;
  v_review jsonb;
  v_answers jsonb;
  v_reason text;
  v_result jsonb;
  v_code text;
begin
  select * into v_attempt from public.quiz_attempts a
  where a.id = p_attempt_id and a.attempt_token = p_attempt_token for update;
  if not found then raise exception 'INVALID_ATTEMPT'; end if;
  if v_attempt.status = 'Completed' then
    return v_attempt.result_json || jsonb_build_object(
      'is_valid_for_award', v_attempt.is_valid_for_award, 'invalid_reason', v_attempt.invalid_reason
    );
  end if;
  if v_attempt.status <> 'InProgress' or (
    upper(btrim(v_attempt.employee_code)) <> '24040025' and exists (
      select 1 from public.quiz_attempts a
      where upper(btrim(a.employee_code)) = upper(btrim(v_attempt.employee_code))
        and a.id <> v_attempt.id
        and (a.status = 'Completed' or (a.started_at, a.id) < (v_attempt.started_at, v_attempt.id))
    )
  ) then raise exception 'ATTEMPT_USED'; end if;

  -- The previous frontend sends its answers in the final request. Handle that
  -- payload during rollout using the same one-time grading path.
  if jsonb_typeof(p_final_answers) = 'object' then
    for v_code in
      select code from jsonb_array_elements_text(v_attempt.selected_questions_json) with ordinality as q(code, idx)
      where not (v_attempt.question_feedback_json ? code)
      order by idx
    loop
      perform public.answer_verified_quiz_question(p_attempt_id, p_attempt_token, v_code, p_final_answers->v_code);
    end loop;
    select * into v_attempt from public.quiz_attempts where id = p_attempt_id;
  end if;

  select count(*), count(*) filter (where q.correct),
    jsonb_build_object(
      'LOOK', count(*) filter (where q.correct and q.stage = 'LOOK'),
      'THINK', count(*) filter (where q.correct and q.stage = 'THINK'),
      'CONNECT', count(*) filter (where q.correct and q.stage = 'CONNECT')
    ), jsonb_agg(f.item order by ord.idx), jsonb_object_agg(ord.code, f.item->'user_answer')
  into v_total, v_score, v_by_stage, v_review, v_answers
  from jsonb_array_elements_text(v_attempt.selected_questions_json) with ordinality as ord(code, idx)
  cross join lateral (select v_attempt.question_feedback_json->ord.code as item) f
  cross join lateral (select (f.item->>'is_correct')::boolean as correct, f.item->>'stage' as stage) q
  where f.item is not null;

  if v_total <> 15 then raise exception 'QUESTIONS_INCOMPLETE'; end if;
  perform public.flush_quiz_actions(p_attempt_id, p_attempt_token, p_events, v_answers);
  select min_valid_seconds into v_min_seconds from public.campaigns where id = v_attempt.campaign_id;
  v_duration := greatest(1, extract(epoch from (now() - v_attempt.started_at))::integer);
  if v_duration < v_min_seconds then
    v_reason := format('Thời gian làm bài quá ngắn (%ss < %ss)', v_duration, v_min_seconds);
  end if;
  v_result := jsonb_build_object(
    'ok', true, 'attempt_id', p_attempt_id, 'score', v_score, 'total', v_total,
    'score_by_stage', v_by_stage, 'duration_seconds', v_duration,
    'is_valid_for_award', v_reason is null, 'invalid_reason', v_reason, 'review', v_review
  );
  update public.quiz_attempts
  set status = 'Completed', final_answers_json = v_answers, score = v_score, score_by_stage = v_by_stage,
    duration_seconds = v_duration, submitted_at = now(), is_valid_for_award = (v_reason is null),
    invalid_reason = v_reason, result_json = v_result
  where id = p_attempt_id;
  return v_result;
end;
$$;

create or replace function public.start_verified_quiz_attempt(p_campaign_id uuid, p_verification_token uuid, p_device_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employee_roster%rowtype;
  v_campaign public.campaigns%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_questions jsonb;
  v_selected jsonb;
  v_resumed boolean;
  v_can_retry boolean;
  v_attempt_number integer := 1;
begin
  select r.* into v_employee from public.quiz_employee_visits v
  join public.employee_roster r on r.employee_code = v.employee_code
  where v.verification_token = p_verification_token and v.campaign_id = p_campaign_id
    and v.verified_at >= now() - interval '1 hour';
  if not found then
    raise exception 'Phiên xác nhận đã hết hạn. Vui lòng xác nhận lại mã nhân viên.';
  end if;

  select * into v_campaign from public.campaigns where id = p_campaign_id and status = 'Active';
  if not found then raise exception 'Đợt khảo sát đã đóng.'; end if;

  v_can_retry := v_employee.employee_code = '24040025';
  perform pg_advisory_xact_lock(hashtext('mmv:one-attempt'), hashtext(v_employee.employee_code));
  if not v_can_retry and exists (select 1 from public.quiz_attempts a
             where upper(btrim(a.employee_code)) = v_employee.employee_code and a.status = 'Completed') then
    raise exception 'ATTEMPT_USED';
  end if;
  select * into v_attempt from public.quiz_attempts
  where upper(btrim(employee_code)) = v_employee.employee_code
    and (not v_can_retry or (campaign_id = p_campaign_id and status = 'InProgress'))
  order by started_at, id limit 1 for update;
  if found and (v_attempt.status <> 'InProgress' or v_attempt.campaign_id <> p_campaign_id) then
    raise exception 'ATTEMPT_USED';
  end if;
  v_resumed := found;

  if not v_resumed then
    if v_can_retry then
      select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
      from public.quiz_attempts where upper(btrim(employee_code)) = v_employee.employee_code;
    end if;
    select jsonb_agg(question_code order by question_code) into v_selected from public.questions
    where question_code between 'V2035-01' and 'V2035-15' and question_code ~ '^V2035-[0-9]{2}$'
      and review_status = 'Da_duyet';
    if coalesce(jsonb_array_length(v_selected), 0) <> 15 then
      raise exception 'Bộ 15 câu hỏi chưa sẵn sàng. Vui lòng liên hệ quản trị viên.';
    end if;
    insert into public.quiz_attempts (
      campaign_id, employee_code, full_name, department, attempt_number, selected_questions_json, device_type
    ) values (
      p_campaign_id, v_employee.employee_code, v_employee.full_name, v_employee.company_code, v_attempt_number,
      v_selected, case when p_device_type = 'Mobile' then 'Mobile' else 'Desktop' end
    ) returning * into v_attempt;
  end if;

  select jsonb_agg(jsonb_build_object(
    'question_code', q.question_code, 'stage', q.stage, 'concept', q.concept,
    'question_type', q.question_type, 'prompt_text', q.prompt_text,
    'options_json', case when q.question_type = 'ACTION_BUILDER' and q.shuffle_options then (
      select jsonb_agg(opt order by md5(v_attempt.id::text || (opt->>'key')))
      from jsonb_array_elements(q.options_json) opt
    ) else q.options_json end,
    'media_urls_json', q.media_urls_json, 'shuffle_options', q.shuffle_options, 'mascot_pose', q.mascot_pose
  ) order by ord.idx) into v_questions
  from jsonb_array_elements_text(v_attempt.selected_questions_json) with ordinality as ord(qcode, idx)
  join public.questions q on q.question_code = ord.qcode;

  if coalesce(jsonb_array_length(v_questions), 0) <> jsonb_array_length(v_attempt.selected_questions_json) then
    raise exception 'Thiếu dữ liệu câu hỏi của lượt làm bài.';
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id, 'attempt_token', v_attempt.attempt_token, 'attempt_number', v_attempt.attempt_number,
    'started_at', v_attempt.started_at, 'draft_answers', v_attempt.draft_answers_json,
    'resumed', v_resumed, 'questions', v_questions, 'feedback', v_attempt.question_feedback_json,
    'last_event_seq', (select coalesce(max(client_seq), 0) from public.quiz_action_logs where attempt_id = v_attempt.id)
  );
end;
$$;
