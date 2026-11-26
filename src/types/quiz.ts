export type UserRole = 'employee' | 'reviewer' | 'hr_viewer' | 'admin'
export type EmployeeType = 'Genba' | 'Office' | 'Management'
export type Stage = 'LOOK' | 'THINK' | 'CONNECT'
export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'IMAGE_CHOICE'
  | 'MULTI_FILL_BLANK'
  | 'TRUE_FALSE'
  | 'SPOT_DIFFERENCE'
export type ReviewStatus = 'Chua_duyet' | 'Can_chinh_sua' | 'Da_duyet' | 'Archived'

export interface UserProfile {
  id: string
  employee_code: string
  full_name: string
  email?: string | null
  department: string
  employee_type: EmployeeType
  role: UserRole
  verify_pin?: string | null
  is_active: boolean
}

export interface Campaign {
  id: string
  campaign_code: string
  title: string
  quiz_mode: 'Set_A' | 'Set_B' | 'Random_Pool_15'
  stage_mix: { LOOK: number; THINK: number; CONNECT: number }
  max_attempts: number
  min_valid_seconds: number
  suggested_minutes: number
  start_at: string
  end_at: string
  status: 'Draft' | 'Active' | 'Closed'
  show_leaderboard: boolean
  google_sheet_webhook?: string | null
}

export interface QuestionOption {
  key: string
  text: string
  imageUrl?: string
}

export interface QuestionItem {
  id?: string
  question_code: string
  source_set: 'Bo_A' | 'Bo_B' | 'Bo_Sung'
  stage: Stage
  concept: string
  question_type: QuestionType
  prompt_text: string
  options_json: QuestionOption[]
  correct_answer_json: { keys: string[] }
  explanation: string
  media_urls_json?: string[]
  shuffle_options: boolean
  mascot_pose: string
  review_status: ReviewStatus
  reviewer_note?: string
  needs_verification?: boolean
}

export type SafeQuestion = Omit<QuestionItem, 'correct_answer_json' | 'explanation' | 'review_status'>

export type ActionEventType =
  | 'SESSION_START'
  | 'STAGE_ENTER'
  | 'QUESTION_VIEW'
  | 'OPTION_SELECT'
  | 'OPTION_CHANGE'
  | 'ANSWER_SUBMIT'
  | 'TAB_BLUR'
  | 'TAB_FOCUS'
  | 'QUIZ_SUBMIT'
  | 'EXPLANATION_VIEW'

export interface QuizActionEvent {
  attempt_id: string
  client_seq: number
  employee_code: string
  question_code?: string
  stage: 'INTRO' | Stage | 'RESULT'
  event_type: ActionEventType
  event_payload: Record<string, unknown>
  time_spent_ms: number
  event_time: string
}

export interface QuizAttempt {
  id: string
  attempt_token?: string
  campaign_id: string
  employee_code: string
  full_name: string
  department: string
  attempt_number: number
  status: 'InProgress' | 'Completed' | 'Abandoned'
  selected_questions_json: string[]
  draft_answers_json: Record<string, string[]>
  final_answers_json?: Record<string, string[]>
  score: number
  score_by_stage?: { LOOK: number; THINK: number; CONNECT: number }
  duration_seconds?: number
  tab_switch_count: number
  started_at: string
  submitted_at?: string
  is_valid_for_award: boolean
  invalid_reason?: string | null
  device_type: 'Mobile' | 'Desktop'
}

export interface QuizReviewItem {
  question_code: string
  stage: Stage
  concept: string
  prompt_text: string
  options_json: QuestionOption[]
  user_answer: string[]
  correct_answer: string[]
  is_correct: boolean
  explanation: string
}

export interface SubmitQuizResponse {
  ok: boolean
  attempt_id: string
  score: number
  total: number
  score_by_stage: { LOOK: number; THINK: number; CONNECT: number }
  duration_seconds: number
  is_valid_for_award: boolean
  invalid_reason?: string | null
  review: QuizReviewItem[]
}

export interface AdminAuditLog {
  id: string
  actor_email: string
  action_type: string
  target_id: string
  changes_json: Record<string, unknown>
  created_at: string
}
