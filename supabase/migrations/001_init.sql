-- =============================================================================
-- DiVA Vision Explorer Quiz (MMV Vision 2035) - Supabase PostgreSQL Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS public.users_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE,
  department text NOT NULL,
  employee_type text NOT NULL CHECK (employee_type IN ('Genba', 'Office', 'Management')),
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'reviewer', 'hr_viewer', 'admin')),
  verify_pin text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_roles_code ON public.users_roles (employee_code);
CREATE INDEX IF NOT EXISTS idx_users_roles_dept ON public.users_roles (department);
CREATE INDEX IF NOT EXISTS idx_users_roles_role ON public.users_roles (role);

-- 2. CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code text UNIQUE NOT NULL,
  title text NOT NULL,
  quiz_mode text NOT NULL DEFAULT 'Random_Pool_15' CHECK (quiz_mode IN ('Set_A', 'Set_B', 'Random_Pool_15')),
  stage_mix jsonb NOT NULL DEFAULT '{"LOOK": 5, "THINK": 6, "CONNECT": 4}'::jsonb,
  max_attempts int NOT NULL DEFAULT 0,
  min_valid_seconds int NOT NULL DEFAULT 60,
  suggested_minutes int NOT NULL DEFAULT 10,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Closed')),
  show_leaderboard boolean NOT NULL DEFAULT true,
  google_sheet_webhook text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code text UNIQUE NOT NULL,
  source_set text NOT NULL DEFAULT 'Bo_A' CHECK (source_set IN ('Bo_A', 'Bo_B', 'Bo_Sung')),
  stage text NOT NULL CHECK (stage IN ('LOOK', 'THINK', 'CONNECT')),
  concept text NOT NULL,
  question_type text NOT NULL DEFAULT 'SINGLE_CHOICE'
    CHECK (question_type IN ('SINGLE_CHOICE', 'IMAGE_CHOICE', 'MULTI_FILL_BLANK', 'TRUE_FALSE', 'SPOT_DIFFERENCE')),
  prompt_text text NOT NULL,
  options_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer_json jsonb NOT NULL DEFAULT '{"keys":[]}'::jsonb,
  explanation text NOT NULL DEFAULT '',
  media_urls_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  shuffle_options boolean NOT NULL DEFAULT true,
  mascot_pose text NOT NULL DEFAULT 'pointing',
  review_status text NOT NULL DEFAULT 'Chua_duyet'
    CHECK (review_status IN ('Chua_duyet', 'Can_chinh_sua', 'Da_duyet', 'Archived')),
  reviewer_note text,
  approved_by uuid REFERENCES public.users_roles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_stage_status ON public.questions (stage, review_status);
CREATE INDEX IF NOT EXISTS idx_questions_source_set ON public.questions (source_set);

-- 4. QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_token uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  full_name text NOT NULL,
  department text NOT NULL,
  attempt_number int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'InProgress' CHECK (status IN ('InProgress', 'Completed', 'Abandoned')),
  selected_questions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_answers_json jsonb,
  score int NOT NULL DEFAULT 0,
  score_by_stage jsonb,
  duration_seconds int,
  tab_switch_count int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  is_valid_for_award boolean NOT NULL DEFAULT false,
  invalid_reason text,
  device_type text NOT NULL DEFAULT 'Mobile'
);

CREATE INDEX IF NOT EXISTS idx_attempts_campaign_emp ON public.quiz_attempts (campaign_id, employee_code);
CREATE INDEX IF NOT EXISTS idx_attempts_award ON public.quiz_attempts (campaign_id, is_valid_for_award, score DESC, duration_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_attempts_dept ON public.quiz_attempts (department);

-- 5. QUIZ ACTION LOGS (Granular User Telemetry)
CREATE TABLE IF NOT EXISTS public.quiz_action_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  client_seq int NOT NULL,
  employee_code text NOT NULL,
  question_code text,
  stage text NOT NULL DEFAULT 'INTRO',
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_spent_ms int NOT NULL DEFAULT 0,
  event_time timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, client_seq)
);

CREATE INDEX IF NOT EXISTS idx_action_logs_attempt ON public.quiz_action_logs (attempt_id, client_seq);
CREATE INDEX IF NOT EXISTS idx_action_logs_question ON public.quiz_action_logs (question_code, event_type);

-- 6. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES public.users_roles(id),
  actor_email text NOT NULL,
  action_type text NOT NULL,
  target_id text NOT NULL,
  changes_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- HELPER FUNCTION & RLS POLICIES
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users_roles WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1),
    'employee'
  );
$$;

ALTER TABLE public.users_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users_roles
CREATE POLICY "Users read own profile or admin/hr read all"
  ON public.users_roles FOR SELECT
  USING (auth_user_id = auth.uid() OR public.current_app_role() IN ('admin', 'hr_viewer', 'reviewer'));

CREATE POLICY "Admin manage users_roles"
  ON public.users_roles FOR ALL
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Policies: campaigns
CREATE POLICY "Anyone read active campaigns"
  ON public.campaigns FOR SELECT
  USING (status = 'Active' OR public.current_app_role() IN ('admin', 'hr_viewer', 'reviewer'));

CREATE POLICY "Admin manage campaigns"
  ON public.campaigns FOR ALL
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Policies: questions (CRITICAL: Block employee/anon from reading correct_answer_json directly!)
CREATE POLICY "Reviewer and Admin manage questions"
  ON public.questions FOR ALL
  USING (public.current_app_role() IN ('admin', 'reviewer'))
  WITH CHECK (public.current_app_role() IN ('admin', 'reviewer'));

-- Policies: quiz_attempts
CREATE POLICY "HR and Admin read attempts"
  ON public.quiz_attempts FOR SELECT
  USING (public.current_app_role() IN ('admin', 'hr_viewer'));

CREATE POLICY "Admin update attempts validity"
  ON public.quiz_attempts FOR UPDATE
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Policies: quiz_action_logs
CREATE POLICY "HR and Admin read action logs"
  ON public.quiz_action_logs FOR SELECT
  USING (public.current_app_role() IN ('admin', 'hr_viewer'));

-- Policies: admin_audit_logs
CREATE POLICY "Admin read/insert audit logs"
  ON public.admin_audit_logs FOR ALL
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() IN ('admin', 'reviewer'));

-- =============================================================================
-- SERVER-SIDE RPC FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- RPC 1: Verify Genba employee & return active campaign summary
CREATE OR REPLACE FUNCTION public.genba_verify_employee(
  p_employee_code text,
  p_verify_pin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_campaign record;
  v_attempt_count int;
  v_in_progress uuid;
BEGIN
  SELECT * INTO v_user
  FROM public.users_roles
  WHERE upper(employee_code) = upper(trim(p_employee_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mã nhân viên không tồn tại hoặc chưa được kích hoạt.');
  END IF;

  IF v_user.verify_pin IS NOT NULL AND v_user.verify_pin <> '' THEN
    IF p_verify_pin IS NULL OR trim(p_verify_pin) <> v_user.verify_pin THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Mã xác nhận (4 số ngày sinh) chưa đúng.');
    END IF;
  END IF;

  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE status = 'Active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Hiện chưa có đợt Quiz nào đang mở.');
  END IF;

  SELECT count(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE campaign_id = v_campaign.id
    AND employee_code = v_user.employee_code
    AND status = 'Completed';

  SELECT id INTO v_in_progress
  FROM public.quiz_attempts
  WHERE campaign_id = v_campaign.id
    AND employee_code = v_user.employee_code
    AND status = 'InProgress'
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'employee_code', v_user.employee_code,
      'full_name', v_user.full_name,
      'department', v_user.department,
      'employee_type', v_user.employee_type
    ),
    'campaign', to_jsonb(v_campaign),
    'completed_attempts', v_attempt_count,
    'in_progress_attempt_id', v_in_progress
  );
END;
$$;

-- RPC 2: Start or Resume quiz attempt (returns safe questions WITHOUT answers)
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(
  p_campaign_id uuid,
  p_employee_code text,
  p_device_type text DEFAULT 'Mobile'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_campaign record;
  v_existing record;
  v_attempt_no int;
  v_selected jsonb;
  v_attempt_id uuid;
  v_token uuid;
  v_questions jsonb;
BEGIN
  SELECT * INTO v_user FROM public.users_roles
  WHERE upper(employee_code) = upper(trim(p_employee_code)) AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found or inactive';
  END IF;

  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id AND status = 'Active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not active';
  END IF;

  -- Check existing InProgress attempt
  SELECT * INTO v_existing FROM public.quiz_attempts
  WHERE campaign_id = p_campaign_id AND employee_code = v_user.employee_code AND status = 'InProgress'
  ORDER BY started_at DESC LIMIT 1;

  IF FOUND THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'question_code', q.question_code,
        'stage', q.stage,
        'concept', q.concept,
        'question_type', q.question_type,
        'prompt_text', q.prompt_text,
        'options_json', q.options_json,
        'media_urls_json', q.media_urls_json,
        'shuffle_options', q.shuffle_options,
        'mascot_pose', q.mascot_pose
      ) ORDER BY ord.idx
    ) INTO v_questions
    FROM jsonb_array_elements_text(v_existing.selected_questions_json) WITH ORDINALITY AS ord(qcode, idx)
    JOIN public.questions q ON q.question_code = ord.qcode;

    RETURN jsonb_build_object(
      'attempt_id', v_existing.id,
      'attempt_token', v_existing.attempt_token,
      'attempt_number', v_existing.attempt_number,
      'started_at', v_existing.started_at,
      'draft_answers', v_existing.draft_answers_json,
      'resumed', true,
      'questions', COALESCE(v_questions, '[]'::jsonb)
    );
  END IF;

  SELECT count(*) + 1 INTO v_attempt_no
  FROM public.quiz_attempts
  WHERE campaign_id = p_campaign_id AND employee_code = v_user.employee_code;

  IF v_campaign.max_attempts > 0 AND v_attempt_no > v_campaign.max_attempts THEN
    RAISE EXCEPTION 'Max attempts reached';
  END IF;

  -- Select 5 LOOK + 6 THINK + 4 CONNECT from approved questions
  WITH picked AS (
    (SELECT question_code, 1 AS stage_ord, random() AS rnd FROM public.questions
     WHERE stage = 'LOOK' AND review_status = 'Da_duyet'
       AND (v_campaign.quiz_mode = 'Random_Pool_15'
            OR (v_campaign.quiz_mode = 'Set_A' AND source_set = 'Bo_A')
            OR (v_campaign.quiz_mode = 'Set_B' AND source_set = 'Bo_B'))
     ORDER BY CASE WHEN v_campaign.quiz_mode = 'Random_Pool_15' THEN random() ELSE 0 END, question_code
     LIMIT COALESCE((v_campaign.stage_mix->>'LOOK')::int, 5))
    UNION ALL
    (SELECT question_code, 2 AS stage_ord, random() AS rnd FROM public.questions
     WHERE stage = 'THINK' AND review_status = 'Da_duyet'
       AND (v_campaign.quiz_mode = 'Random_Pool_15'
            OR (v_campaign.quiz_mode = 'Set_A' AND source_set = 'Bo_A')
            OR (v_campaign.quiz_mode = 'Set_B' AND source_set = 'Bo_B'))
     ORDER BY CASE WHEN v_campaign.quiz_mode = 'Random_Pool_15' THEN random() ELSE 0 END, question_code
     LIMIT COALESCE((v_campaign.stage_mix->>'THINK')::int, 6))
    UNION ALL
    (SELECT question_code, 3 AS stage_ord, random() AS rnd FROM public.questions
     WHERE stage = 'CONNECT' AND review_status = 'Da_duyet'
       AND (v_campaign.quiz_mode = 'Random_Pool_15'
            OR (v_campaign.quiz_mode = 'Set_A' AND source_set = 'Bo_A')
            OR (v_campaign.quiz_mode = 'Set_B' AND source_set = 'Bo_B'))
     ORDER BY CASE WHEN v_campaign.quiz_mode = 'Random_Pool_15' THEN random() ELSE 0 END, question_code
     LIMIT COALESCE((v_campaign.stage_mix->>'CONNECT')::int, 4))
  )
  SELECT jsonb_agg(question_code ORDER BY stage_ord, rnd) INTO v_selected FROM picked;

  INSERT INTO public.quiz_attempts (
    campaign_id, employee_code, full_name, department, attempt_number, selected_questions_json, device_type
  ) VALUES (
    p_campaign_id, v_user.employee_code, v_user.full_name, v_user.department, v_attempt_no, COALESCE(v_selected, '[]'::jsonb), p_device_type
  )
  RETURNING id, attempt_token INTO v_attempt_id, v_token;

  SELECT jsonb_agg(
    jsonb_build_object(
      'question_code', q.question_code,
      'stage', q.stage,
      'concept', q.concept,
      'question_type', q.question_type,
      'prompt_text', q.prompt_text,
      'options_json', q.options_json,
      'media_urls_json', q.media_urls_json,
      'shuffle_options', q.shuffle_options,
      'mascot_pose', q.mascot_pose
    ) ORDER BY ord.idx
  ) INTO v_questions
  FROM jsonb_array_elements_text(v_selected) WITH ORDINALITY AS ord(qcode, idx)
  JOIN public.questions q ON q.question_code = ord.qcode;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'attempt_token', v_token,
    'attempt_number', v_attempt_no,
    'started_at', now(),
    'draft_answers', '{}'::jsonb,
    'resumed', false,
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$$;

-- RPC 3: Batch flush granular user actions
CREATE OR REPLACE FUNCTION public.flush_quiz_actions(
  p_attempt_id uuid,
  p_attempt_token uuid,
  p_events jsonb,
  p_draft_answers jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt record;
  v_inserted int := 0;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts
  WHERE id = p_attempt_id AND attempt_token = p_attempt_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized attempt token';
  END IF;

  INSERT INTO public.quiz_action_logs (
    attempt_id, client_seq, employee_code, question_code, stage, event_type, event_payload, time_spent_ms, event_time
  )
  SELECT
    p_attempt_id,
    (ev->>'client_seq')::int,
    v_attempt.employee_code,
    ev->>'question_code',
    COALESCE(ev->>'stage', 'INTRO'),
    ev->>'event_type',
    COALESCE(ev->'event_payload', '{}'::jsonb),
    COALESCE((ev->>'time_spent_ms')::int, 0),
    COALESCE((ev->>'event_time')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(p_events, '[]'::jsonb)) AS ev
  ON CONFLICT (attempt_id, client_seq) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF p_draft_answers IS NOT NULL AND v_attempt.status = 'InProgress' THEN
    UPDATE public.quiz_attempts
    SET draft_answers_json = p_draft_answers,
        tab_switch_count = (
          SELECT count(*) FROM public.quiz_action_logs
          WHERE attempt_id = p_attempt_id AND event_type = 'TAB_BLUR'
        )
    WHERE id = p_attempt_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'inserted', v_inserted);
END;
$$;

-- RPC 4: Server-side grading & submit
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
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts
  WHERE id = p_attempt_id AND attempt_token = p_attempt_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized attempt token';
  END IF;

  IF v_attempt.status = 'Completed' THEN
    RETURN jsonb_build_object('ok', true, 'already_submitted', true, 'score', v_attempt.score);
  END IF;

  -- Flush final batch
  PERFORM public.flush_quiz_actions(p_attempt_id, p_attempt_token, p_events, p_final_answers);

  SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_attempt.campaign_id;

  FOR v_q IN
    SELECT q.*, ord.idx
    FROM jsonb_array_elements_text(v_attempt.selected_questions_json) WITH ORDINALITY AS ord(qcode, idx)
    JOIN public.questions q ON q.question_code = ord.qcode
    ORDER BY ord.idx
  LOOP
    v_user_ans := COALESCE(p_final_answers->v_q.question_code, '[]'::jsonb);
    v_correct_ans := COALESCE(v_q.correct_answer_json->'keys', '[]'::jsonb);
    v_is_correct := (v_user_ans = v_correct_ans);

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

  UPDATE public.quiz_attempts
  SET status = 'Completed',
      final_answers_json = p_final_answers,
      score = v_score,
      score_by_stage = jsonb_build_object('LOOK', v_look, 'THINK', v_think, 'CONNECT', v_connect),
      duration_seconds = v_duration,
      submitted_at = now(),
      is_valid_for_award = v_is_valid,
      invalid_reason = v_invalid_reason
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
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
END;
$$;

-- Storage Bucket for Vision 2035 Assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-assets', 'quiz-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read quiz-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quiz-assets');

CREATE POLICY "Reviewer and Admin upload quiz-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quiz-assets' AND public.current_app_role() IN ('admin', 'reviewer'));
