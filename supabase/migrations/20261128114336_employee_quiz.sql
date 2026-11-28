alter table public.quiz_attempts add column result_json jsonb;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_attempt_id uuid,
  p_attempt_token uuid,
  p_events jsonb,
  p_final_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt record;
  v_campaign record;
  v_score int := 0;
  v_look int := 0;
  v_think int := 0;
  v_connect int := 0;
  v_duration int;
  v_has_prior_valid boolean;
  v_is_valid boolean;
  v_invalid_reason text := NULL;
  v_review jsonb := '[]'::jsonb;
  v_q record;
  v_user_ans jsonb;
  v_correct_ans jsonb;
  v_is_correct boolean;
  v_result jsonb;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts
  WHERE id = p_attempt_id AND attempt_token = p_attempt_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized attempt token';
  END IF;

  IF v_attempt.status = 'Completed' AND v_attempt.result_json IS NOT NULL THEN
    RETURN v_attempt.result_json || jsonb_build_object(
      'is_valid_for_award', v_attempt.is_valid_for_award, 'invalid_reason', v_attempt.invalid_reason
    );
  END IF;
  IF v_attempt.status NOT IN ('InProgress', 'Completed') THEN
    RAISE EXCEPTION 'Lượt làm bài đã đóng.';
  END IF;
  IF v_attempt.status = 'Completed' THEN
    p_final_answers := v_attempt.final_answers_json;
  ELSIF jsonb_typeof(p_final_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Câu trả lời không hợp lệ.';
  END IF;

  -- Flush final batch
  IF v_attempt.status = 'InProgress' THEN
    PERFORM public.flush_quiz_actions(p_attempt_id, p_attempt_token, p_events, p_final_answers);
  END IF;

  SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_attempt.campaign_id;

  FOR v_q IN
    SELECT q.*, ord.idx
    FROM jsonb_array_elements_text(v_attempt.selected_questions_json) WITH ORDINALITY AS ord(qcode, idx)
    JOIN public.questions q ON q.question_code = ord.qcode
    ORDER BY ord.idx
  LOOP
    v_user_ans := COALESCE(p_final_answers->v_q.question_code, '[]'::jsonb);
    v_correct_ans := COALESCE(v_q.correct_answer_json->'keys', '[]'::jsonb);
    IF v_attempt.status = 'InProgress' AND left(v_q.question_code, 6) = 'V2035-' THEN
      IF jsonb_typeof(v_user_ans) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Câu trả lời không hợp lệ.';
      END IF;
      IF jsonb_array_length(v_user_ans) <> jsonb_array_length(v_correct_ans)
        OR (SELECT count(DISTINCT k) FROM jsonb_array_elements_text(v_user_ans) AS a(k)) <> jsonb_array_length(v_user_ans)
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_user_ans) AS a(k)
          WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_q.options_json) opt WHERE opt->>'key' = a.k)
        ) THEN
        RAISE EXCEPTION 'Vui lòng chọn đủ đáp án hợp lệ cho câu %.', v_q.question_code;
      END IF;
    END IF;
    v_is_correct := CASE WHEN v_q.question_type = 'ACTION_BUILDER'
      THEN v_user_ans @> v_correct_ans AND v_correct_ans @> v_user_ans
      ELSE v_user_ans = v_correct_ans END;

    IF v_is_correct THEN
      v_score := v_score + 1;
      IF v_q.stage = 'LOOK' THEN v_look := v_look + 1;
      ELSIF v_q.stage = 'THINK' THEN v_think := v_think + 1;
      ELSIF v_q.stage = 'CONNECT' THEN v_connect := v_connect + 1;
      END IF;
    END IF;

    v_review := v_review || jsonb_build_array(
      jsonb_build_object(
        'question_code', v_q.question_code,
        'stage', v_q.stage,
        'concept', v_q.concept,
        'prompt_text', v_q.prompt_text,
        'options_json', v_q.options_json,
        'user_answer', v_user_ans,
        'correct_answer', v_correct_ans,
        'is_correct', v_is_correct,
        'explanation', v_q.explanation
      )
    );
  END LOOP;

  IF v_attempt.status = 'Completed' THEN
    RETURN jsonb_build_object(
      'ok', true, 'attempt_id', p_attempt_id, 'score', v_attempt.score,
      'total', jsonb_array_length(v_attempt.selected_questions_json),
      'score_by_stage', v_attempt.score_by_stage, 'duration_seconds', v_attempt.duration_seconds,
      'is_valid_for_award', v_attempt.is_valid_for_award, 'invalid_reason', v_attempt.invalid_reason,
      'review', v_review
    );
  END IF;

  v_duration := GREATEST(1, EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int);

  SELECT EXISTS (
    SELECT 1 FROM public.quiz_attempts
    WHERE campaign_id = v_attempt.campaign_id
      AND employee_code = v_attempt.employee_code
      AND status = 'Completed'
      AND is_valid_for_award = true
  ) INTO v_has_prior_valid;

  IF v_has_prior_valid THEN
    v_is_valid := false;
    v_invalid_reason := 'Lượt ôn tập (đã có lượt hợp lệ trước đó)';
  ELSIF v_duration < v_campaign.min_valid_seconds THEN
    v_is_valid := false;
    v_invalid_reason := format('Thời gian làm bài quá ngắn (%ss < %ss)', v_duration, v_campaign.min_valid_seconds);
  ELSE
    v_is_valid := true;
  END IF;

  v_result := jsonb_build_object(
    'ok', true,
    'attempt_id', p_attempt_id,
    'score', v_score,
    'total', jsonb_array_length(v_attempt.selected_questions_json),
    'score_by_stage', jsonb_build_object('LOOK', v_look, 'THINK', v_think, 'CONNECT', v_connect),
    'duration_seconds', v_duration,
    'is_valid_for_award', v_is_valid,
    'invalid_reason', v_invalid_reason,
    'review', v_review
  );
  UPDATE public.quiz_attempts
  SET status = 'Completed',
      final_answers_json = p_final_answers,
      score = v_score,
      score_by_stage = jsonb_build_object('LOOK', v_look, 'THINK', v_think, 'CONNECT', v_connect),
      duration_seconds = v_duration,
      submitted_at = now(),
      is_valid_for_award = v_is_valid,
      invalid_reason = v_invalid_reason,
      result_json = v_result
  WHERE id = p_attempt_id;

  RETURN v_result;
END;
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
    'completed_attempts', (select count(*) from public.quiz_attempts
      where campaign_id = v_campaign.id and employee_code = v_employee.employee_code and status = 'Completed'),
    'in_progress_attempt_id', (select id from public.quiz_attempts
      where campaign_id = v_campaign.id and employee_code = v_employee.employee_code and status = 'InProgress'
      order by started_at desc limit 1)
  );
end;
$$;

create function public.start_verified_quiz_attempt(p_campaign_id uuid, p_verification_token uuid, p_device_type text)
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
  v_attempt_no integer;
  v_resumed boolean;
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

  perform pg_advisory_xact_lock(hashtext(p_campaign_id::text), hashtext(v_employee.employee_code));
  select * into v_attempt from public.quiz_attempts
  where campaign_id = p_campaign_id and employee_code = v_employee.employee_code and status = 'InProgress'
    and jsonb_array_length(selected_questions_json) > 0
  order by started_at desc limit 1;
  v_resumed := found;

  if not v_resumed then
    select coalesce(max(attempt_number), 0) + 1 into v_attempt_no from public.quiz_attempts
    where campaign_id = p_campaign_id and employee_code = v_employee.employee_code;
    if v_campaign.max_attempts > 0 and v_attempt_no > v_campaign.max_attempts then
      raise exception 'Bạn đã sử dụng hết lượt làm bài cho phép.';
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
      p_campaign_id, v_employee.employee_code, v_employee.full_name, v_employee.company_code, v_attempt_no,
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
    'resumed', v_resumed, 'questions', v_questions,
    'last_event_seq', (select coalesce(max(client_seq), 0) from public.quiz_action_logs where attempt_id = v_attempt.id)
  );
end;
$$;

revoke execute on function public.start_quiz_attempt(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.genba_verify_employee(text, text),
  public.start_verified_quiz_attempt(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.genba_verify_employee(text, text),
  public.start_verified_quiz_attempt(uuid, uuid, text) to anon, authenticated;
