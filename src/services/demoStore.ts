import excelQuestionsRaw from '@/data/excelQuestions.json'
import type {
  AdminAuditLog,
  Campaign,
  QuestionItem,
  QuizActionEvent,
  QuizAttempt,
  UserProfile,
} from '@/types/quiz'

const STORAGE_KEY = 'diva_quiz_demo_db_v1'

export interface DemoDatabase {
  users: UserProfile[]
  campaigns: Campaign[]
  questions: QuestionItem[]
  attempts: QuizAttempt[]
  actionLogs: QuizActionEvent[]
  auditLogs: AdminAuditLog[]
}

const bonusMockupQuestion: QuestionItem = {
  id: 'q-m01',
  question_code: 'M01',
  source_set: 'Bo_Sung',
  stage: 'THINK',
  concept: 'Missing Piece',
  question_type: 'MULTI_FILL_BLANK',
  prompt_text:
    'DiVA hướng đến việc trở thành một chuỗi cung ứng {{blank_1}}, {{blank_2}}, và {{blank_3}} để tạo giá trị bền vững cho khách hàng.',
  options_json: [
    { key: 'A', text: 'Linh hoạt' },
    { key: 'B', text: 'Hiệu quả' },
    { key: 'C', text: 'An toàn' },
    { key: 'D', text: 'Bền vững' },
    { key: 'E', text: 'Sáng tạo' },
    { key: 'F', text: 'Ổn định' },
  ],
  correct_answer_json: { keys: ['A', 'B', 'D'] },
  explanation:
    'Theo minh họa DiVA Concept: chuỗi cung ứng Linh hoạt, Hiệu quả và Bền vững giúp MMV tạo giá trị lâu dài cho khách hàng.',
  shuffle_options: false,
  mascot_pose: 'thinking',
  review_status: 'Chua_duyet',
  reviewer_note: 'Câu bổ sung theo ảnh Mockup Chặng 2 THINK (bật Đã duyệt để đưa vào pool)',
  needs_verification: true,
}

const initialUsers: UserProfile[] = [
  {
    id: 'u-admin',
    employee_code: 'MMV0001',
    full_name: 'Quản trị Hệ thống DiVA',
    email: 'admin@mmv.local',
    department: 'HR & DiVA Team',
    employee_type: 'Office',
    role: 'admin',
    is_active: true,
  },
  {
    id: 'u-reviewer',
    employee_code: 'MMV0002',
    full_name: 'Kiểm duyệt Nội dung',
    email: 'reviewer@mmv.local',
    department: 'HR & DiVA Team',
    employee_type: 'Office',
    role: 'reviewer',
    is_active: true,
  },
  {
    id: 'u-hr',
    employee_code: 'MMV0003',
    full_name: 'Quản lý Nhân sự HR',
    email: 'hr@mmv.local',
    department: 'Human Resources',
    employee_type: 'Management',
    role: 'hr_viewer',
    is_active: true,
  },
  {
    id: 'u-emp1',
    employee_code: 'MMV0101',
    full_name: 'Nguyễn Văn An',
    email: null,
    department: 'Sản xuất - Line 1',
    employee_type: 'Genba',
    role: 'employee',
    is_active: true,
  },
  {
    id: 'u-emp2',
    employee_code: 'MMV0102',
    full_name: 'Trần Thị Bình',
    email: null,
    department: 'Sản xuất - Line 1',
    employee_type: 'Genba',
    role: 'employee',
    is_active: true,
  },
  {
    id: 'u-emp3',
    employee_code: 'MMV0103',
    full_name: 'Phạm Hoàng Nam',
    email: null,
    department: 'Sản xuất - Line 2',
    employee_type: 'Genba',
    role: 'employee',
    is_active: true,
  },
  {
    id: 'u-emp4',
    employee_code: 'MMV0201',
    full_name: 'Lê Minh Cường',
    email: 'cuong.le@mmv.local',
    department: 'Kỹ thuật (Engineering)',
    employee_type: 'Office',
    role: 'employee',
    is_active: true,
  },
  {
    id: 'u-emp5',
    employee_code: 'MMV0202',
    full_name: 'Vũ Thu Hà',
    email: 'ha.vu@mmv.local',
    department: 'Kỹ thuật (Engineering)',
    employee_type: 'Office',
    role: 'employee',
    is_active: true,
  },
]

const initialCampaigns: Campaign[] = [
  {
    id: 'camp-v1',
    campaign_code: 'VISION2035_V1',
    title: 'Khám phá Vision 2035 – Hiểu Vision, vui cùng MMV!',
    quiz_mode: 'Random_Pool_15',
    stage_mix: { LOOK: 5, THINK: 6, CONNECT: 4 },
    max_attempts: 0,
    min_valid_seconds: 60,
    suggested_minutes: 10,
    start_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    status: 'Active',
    show_leaderboard: true,
    google_sheet_webhook: '',
  },
]

const seedAttempts: QuizAttempt[] = [
  {
    id: 'att-seed-1',
    campaign_id: 'camp-v1',
    employee_code: 'MMV0201',
    full_name: 'Lê Minh Cường',
    department: 'Kỹ thuật (Engineering)',
    attempt_number: 1,
    status: 'Completed',
    selected_questions_json: [
      'A01', 'A02', 'A03', 'A04', 'B01',
      'A06', 'A07', 'A08', 'A09', 'A10', 'A11',
      'A12', 'A13', 'A14', 'A15',
    ],
    draft_answers_json: {},
    final_answers_json: {
      A01: ['A'], A02: ['A'], A03: ['A'], A04: ['A'], B01: ['B'],
      A06: ['B'], A07: ['B'], A08: ['C'], A09: ['B'], A10: ['C'], A11: ['B'],
      A12: ['B'], A13: ['C'], A14: ['B'], A15: ['B'],
    },
    score: 15,
    score_by_stage: { LOOK: 5, THINK: 6, CONNECT: 4 },
    duration_seconds: 412,
    tab_switch_count: 0,
    started_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    submitted_at: new Date(Date.now() - 3600000 * 5 + 412000).toISOString(),
    is_valid_for_award: true,
    device_type: 'Desktop',
  },
  {
    id: 'att-seed-2',
    campaign_id: 'camp-v1',
    employee_code: 'MMV0102',
    full_name: 'Trần Thị Bình',
    department: 'Sản xuất - Line 1',
    attempt_number: 1,
    status: 'Completed',
    selected_questions_json: [
      'A01', 'A02', 'A03', 'A04', 'B02',
      'B06', 'B07', 'B08', 'B09', 'B10', 'B11',
      'B12', 'B13', 'B14', 'B15',
    ],
    draft_answers_json: {},
    final_answers_json: {
      A01: ['A'], A02: ['A'], A03: ['A'], A04: ['A'], B02: ['A'],
      B06: ['B'], B07: ['A'], B08: ['B'], B09: ['A'], B10: ['A'], B11: ['B'],
      B12: ['A'], B13: ['B'], B14: ['C'], B15: ['A'],
    },
    score: 14,
    score_by_stage: { LOOK: 5, THINK: 5, CONNECT: 4 },
    duration_seconds: 486,
    tab_switch_count: 1,
    started_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    submitted_at: new Date(Date.now() - 3600000 * 2 + 486000).toISOString(),
    is_valid_for_award: true,
    device_type: 'Mobile',
  },
]

const seedActionLogs: QuizActionEvent[] = [
  {
    attempt_id: 'att-seed-1',
    client_seq: 1,
    employee_code: 'MMV0201',
    stage: 'INTRO',
    event_type: 'SESSION_START',
    event_payload: { device: 'Desktop', quizMode: 'Random_Pool_15' },
    time_spent_ms: 0,
    event_time: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    attempt_id: 'att-seed-1',
    client_seq: 2,
    employee_code: 'MMV0201',
    question_code: 'A01',
    stage: 'LOOK',
    event_type: 'QUESTION_VIEW',
    event_payload: { index: 1 },
    time_spent_ms: 0,
    event_time: new Date(Date.now() - 3600000 * 5 + 3000).toISOString(),
  },
  {
    attempt_id: 'att-seed-1',
    client_seq: 3,
    employee_code: 'MMV0201',
    question_code: 'A01',
    stage: 'LOOK',
    event_type: 'OPTION_SELECT',
    event_payload: { selected: ['B'] },
    time_spent_ms: 5200,
    event_time: new Date(Date.now() - 3600000 * 5 + 8200).toISOString(),
  },
  {
    attempt_id: 'att-seed-1',
    client_seq: 4,
    employee_code: 'MMV0201',
    question_code: 'A01',
    stage: 'LOOK',
    event_type: 'OPTION_CHANGE',
    event_payload: { from: ['B'], to: ['A'] },
    time_spent_ms: 3100,
    event_time: new Date(Date.now() - 3600000 * 5 + 11300).toISOString(),
  },
  {
    attempt_id: 'att-seed-1',
    client_seq: 5,
    employee_code: 'MMV0201',
    question_code: 'A01',
    stage: 'LOOK',
    event_type: 'ANSWER_SUBMIT',
    event_payload: { finalSelected: ['A'] },
    time_spent_ms: 9500,
    event_time: new Date(Date.now() - 3600000 * 5 + 12500).toISOString(),
  },
  {
    attempt_id: 'att-seed-1',
    client_seq: 6,
    employee_code: 'MMV0201',
    stage: 'RESULT',
    event_type: 'QUIZ_SUBMIT',
    event_payload: { score: 15, durationSeconds: 412 },
    time_spent_ms: 0,
    event_time: new Date(Date.now() - 3600000 * 5 + 412000).toISOString(),
  },
]

function buildInitialDb(): DemoDatabase {
  const excelQuestions = (excelQuestionsRaw as QuestionItem[]).map((q, idx) => ({
    ...q,
    id: q.id || `q-${idx + 1}`,
  }))
  return {
    users: initialUsers,
    campaigns: initialCampaigns,
    questions: [...excelQuestions, bonusMockupQuestion],
    attempts: seedAttempts,
    actionLogs: seedActionLogs,
    auditLogs: [
      {
        id: 'aud-1',
        actor_email: 'admin@mmv.local',
        action_type: 'CAMPAIGN_UPDATE',
        target_id: 'VISION2035_V1',
        changes_json: { status: 'Active', note: 'Khởi tạo chiến dịch V1 từ file Excel' },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  }
}

export function loadDemoDb(): DemoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const init = buildInitialDb()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init))
      return init
    }
    return JSON.parse(raw) as DemoDatabase
  } catch {
    const init = buildInitialDb()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init))
    return init
  }
}

export function saveDemoDb(db: DemoDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function resetDemoDb(): DemoDatabase {
  const init = buildInitialDb()
  saveDemoDb(init)
  return init
}
