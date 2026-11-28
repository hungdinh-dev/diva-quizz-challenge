import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { loadDemoDb, resetDemoDb, saveDemoDb } from '@/services/demoStore'
import type {
  AdminAuditLog,
  Campaign,
  EmployeeProgress,
  EmployeeRosterEntry,
  EmployeeVisit,
  QuestionItem,
  QuizActionEvent,
  QuizAttempt,
  QuizReviewItem,
  SafeQuestion,
  SubmitQuizResponse,
  UserProfile,
  UserRole,
} from '@/types/quiz'

const AUTH_SESSION_KEY = 'diva_active_session_v1'
const ATTEMPT_SUMMARY_COLUMNS = 'id,campaign_id,employee_code,full_name,department,attempt_number,status,selected_questions_json,score,score_by_stage,duration_seconds,tab_switch_count,started_at,submitted_at,is_valid_for_award,invalid_reason,device_type'

export interface ActiveSession {
  mode: 'demo' | 'supabase'
  user: UserProfile
  loggedInAt: string
}

export function getActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    return raw ? (JSON.parse(raw) as ActiveSession) : null
  } catch {
    return null
  }
}

export function setActiveSession(session: ActiveSession | null): void {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY)
  } else {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  }
}

function stripQuestionSecrets(q: QuestionItem, attemptId: string): SafeQuestion {
  const { correct_answer_json: _c, explanation: _e, review_status: _r, ...safe } = q
  if (safe.question_type === 'ACTION_BUILDER' && safe.shuffle_options) {
    const order = (key: string) => {
      let value = 2166136261
      for (const char of attemptId + key) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
      return (value ^ (value >>> 16)) >>> 0
    }
    safe.options_json = [...safe.options_json].sort((a, b) => order(a.key) - order(b.key))
  }
  return safe
}

function arraysEqual(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false
  return a.every((val, i) => val === b[i])
}

export const quizService = {
  isUsingSupabase(): boolean {
    return isSupabaseConfigured && Boolean(supabase)
  },

  isDemoAvailable(): boolean {
    return !this.isUsingSupabase() && import.meta.env.DEV
  },

  async verifyEmployee(employeeCode: string, pin?: string): Promise<{
    ok: boolean
    error?: string
    user?: UserProfile
    campaign?: Campaign
    completedAttempts?: number
    attemptUnavailable?: boolean
    inProgressAttemptId?: string | null
    verificationToken?: string
  }> {
    if (this.isUsingSupabase() && supabase) {
      const { data, error } = await supabase.rpc('genba_verify_employee', {
        p_employee_code: employeeCode.trim(),
        p_verify_pin: pin?.trim() || null,
      })
      if (error) return { ok: false, error: error.message }
      if (!data?.ok) return { ok: false, error: data?.error || 'Không tìm thấy nhân viên' }
      return {
        ok: true,
        user: {
          id: data.user.employee_code,
          employee_code: data.user.employee_code,
          full_name: data.user.full_name,
          department: data.user.department,
          employee_type: data.user.employee_type,
          role: 'employee',
          is_active: true,
        },
        campaign: data.campaign,
        completedAttempts: data.completed_attempts,
        attemptUnavailable: Boolean(data.attempt_unavailable) || Number(data.completed_attempts) > 0,
        inProgressAttemptId: data.in_progress_attempt_id,
        verificationToken: data.verification_token,
      }
    }

    if (!this.isDemoAvailable()) return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' }
    const db = loadDemoDb()
    const user = db.users.find(
      (u) => u.employee_code.toUpperCase() === employeeCode.trim().toUpperCase() && u.is_active
    )
    if (!user) {
      return { ok: false, error: 'Mã nhân viên không tồn tại hoặc chưa được kích hoạt (VD thử: MMV0101).' }
    }
    if (user.verify_pin && user.verify_pin !== pin?.trim()) {
      return { ok: false, error: 'Mã xác nhận chưa chính xác.' }
    }
    const campaign = db.campaigns.find((c) => c.status === 'Active')
    if (!campaign) {
      return { ok: false, error: 'Hiện tại chưa có chiến dịch Quiz nào đang mở.' }
    }
    const userAttempts = db.attempts.filter((a) => a.employee_code === user.employee_code)
    const first = [...userAttempts].sort((a, b) => a.started_at.localeCompare(b.started_at))[0]
    const inProg = first?.status === 'InProgress' && first.campaign_id === campaign.id ? first : undefined
    const completed = userAttempts.filter((a) => a.status === 'Completed').length

    return {
      ok: true,
      user,
      campaign,
      completedAttempts: completed,
      attemptUnavailable: completed > 0 || Boolean(first && !inProg),
      inProgressAttemptId: inProg?.id ?? null,
    }
  },

  async startAttempt(
    campaignId: string,
    employeeCode: string,
    deviceType: 'Mobile' | 'Desktop',
    verificationToken?: string,
  ): Promise<{
    attemptId: string
    attemptToken: string
    attemptNumber: number
    startedAt: string
    draftAnswers: Record<string, string[]>
    feedback: Record<string, QuizReviewItem>
    resumed: boolean
    questions: SafeQuestion[]
    lastEventSeq?: number
  }> {
    if (this.isUsingSupabase() && supabase) {
      if (!verificationToken) throw new Error('Vui lòng xác nhận lại mã nhân viên.')
      const { data, error } = await supabase.rpc('start_verified_quiz_attempt', {
        p_campaign_id: campaignId,
        p_verification_token: verificationToken,
        p_device_type: deviceType,
      })
      if (error) throw new Error(error.message)
      return {
        attemptId: data.attempt_id,
        attemptToken: data.attempt_token,
        attemptNumber: data.attempt_number,
        startedAt: data.started_at,
        draftAnswers: data.draft_answers || {},
        feedback: data.feedback || {},
        resumed: Boolean(data.resumed),
        questions: data.questions || [],
        lastEventSeq: data.last_event_seq,
      }
    }

    if (!this.isDemoAvailable()) throw new Error('Chưa cấu hình kết nối Supabase.')
    const db = loadDemoDb()
    const user = db.users.find((u) => u.employee_code === employeeCode)
    const campaign = db.campaigns.find((c) => c.id === campaignId)
    if (!user || !campaign) throw new Error('Dữ liệu người dùng hoặc chiến dịch không hợp lệ.')

    const prior = db.attempts.filter((a) => a.employee_code === employeeCode)
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
    const existing = prior[0]
    const picked = db.questions.filter((q) => /^V2035-(0[1-9]|1[0-5])$/.test(q.question_code) && q.review_status === 'Da_duyet')
      .sort((a, b) => a.question_code.localeCompare(b.question_code))
    if (picked.length !== 15) throw new Error('QUESTION_UNAVAILABLE')
    if (existing) {
      if (prior.some((a) => a.status === 'Completed') || existing.status !== 'InProgress' || existing.campaign_id !== campaignId) {
        throw new Error('ATTEMPT_USED')
      }
      const codes = picked.map((q) => q.question_code)
      if (!arraysEqual(existing.selected_questions_json, codes)) {
        existing.selected_questions_json = codes
        existing.draft_answers_json = {}
        saveDemoDb(db)
      }
      const qList = existing.selected_questions_json
        .map((code) => db.questions.find((q) => q.question_code === code))
        .filter((q): q is QuestionItem => Boolean(q))
        .map((question) => stripQuestionSecrets(question, existing.id))
      return {
        attemptId: existing.id,
        attemptToken: existing.attempt_token || existing.id,
        attemptNumber: existing.attempt_number,
        startedAt: existing.started_at,
        draftAnswers: existing.draft_answers_json || {},
        feedback: existing.question_feedback_json || {},
        resumed: true,
        questions: qList,
      }
    }

    const attemptId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const attemptToken = `tok-${Math.random().toString(36).slice(2, 12)}`
    const nowIso = new Date().toISOString()

    const newAttempt: QuizAttempt = {
      id: attemptId,
      attempt_token: attemptToken,
      campaign_id: campaignId,
      employee_code: user.employee_code,
      full_name: user.full_name,
      department: user.department,
      attempt_number: 1,
      status: 'InProgress',
      selected_questions_json: picked.map((q) => q.question_code),
      draft_answers_json: {},
      score: 0,
      tab_switch_count: 0,
      started_at: nowIso,
      is_valid_for_award: false,
      device_type: deviceType,
    }

    db.attempts.unshift(newAttempt)
    saveDemoDb(db)

    return {
      attemptId,
      attemptToken,
      attemptNumber: newAttempt.attempt_number,
      startedAt: nowIso,
      draftAnswers: {},
      feedback: {},
      resumed: false,
      questions: picked.map((question) => stripQuestionSecrets(question, attemptId)),
    }
  },

  async answerQuestion(attemptId: string, token: string, questionCode: string, keys: string[]): Promise<QuizReviewItem> {
    if (supabase) {
      const { data, error } = await supabase.rpc('answer_verified_quiz_question', {
        p_attempt_id: attemptId, p_attempt_token: token, p_question_code: questionCode, p_answer: keys,
      })
      if (error) throw new Error(error.message)
      return data as QuizReviewItem
    }
    const db = loadDemoDb()
    const attempt = db.attempts.find((item) => item.id === attemptId && item.attempt_token === token)
    if (!attempt || attempt.status !== 'InProgress') throw new Error('INVALID_ATTEMPT')
    const feedback = attempt.question_feedback_json ?? {}
    if (feedback[questionCode]) return feedback[questionCode]
    if (attempt.selected_questions_json.find((code) => !feedback[code]) !== questionCode) throw new Error('QUESTION_OUT_OF_ORDER')
    const question = db.questions.find((item) => item.question_code === questionCode)
    if (!question) throw new Error('QUESTION_UNAVAILABLE')
    const correct = question.correct_answer_json.keys
    if (keys.length !== correct.length || new Set(keys).size !== keys.length ||
      keys.some((key) => !question.options_json.some((option) => option.key === key))) throw new Error('INVALID_ANSWER')
    const result = {
      question_code: questionCode, stage: question.stage, concept: question.concept, prompt_text: question.prompt_text,
      options_json: question.options_json, user_answer: keys, correct_answer: correct, explanation: question.explanation,
      is_correct: question.question_type === 'ACTION_BUILDER' ? arraysEqual([...keys].sort(), [...correct].sort()) : arraysEqual(keys, correct),
    }
    attempt.question_feedback_json = { ...feedback, [questionCode]: result }
    saveDemoDb(db)
    return result
  },

  async flushActions(
    attemptId: string,
    attemptToken: string,
    events: QuizActionEvent[],
    draftAnswers?: Record<string, string[]>
  ): Promise<void> {
    if (this.isUsingSupabase() && supabase) {
      const { error } = await supabase.rpc('flush_quiz_actions', {
        p_attempt_id: attemptId,
        p_attempt_token: attemptToken,
        p_events: events,
        p_draft_answers: draftAnswers || null,
      })
      if (error) throw new Error(error.message)
      return
    }

    const db = loadDemoDb()
    const existingSeqs = new Set(
      db.actionLogs.filter((l) => l.attempt_id === attemptId).map((l) => l.client_seq)
    )
    for (const ev of events) {
      if (!existingSeqs.has(ev.client_seq)) {
        db.actionLogs.push(ev)
        existingSeqs.add(ev.client_seq)
      }
    }
    const att = db.attempts.find((a) => a.id === attemptId)
    if (att && att.status === 'InProgress' && draftAnswers) {
      att.draft_answers_json = draftAnswers
      att.tab_switch_count = db.actionLogs.filter(
        (l) => l.attempt_id === attemptId && l.event_type === 'TAB_BLUR'
      ).length
    }
    saveDemoDb(db)
  },

  async submitAttempt(
    attemptId: string,
    attemptToken: string,
    events: QuizActionEvent[],
  ): Promise<SubmitQuizResponse> {
    if (this.isUsingSupabase() && supabase) {
      const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        p_attempt_id: attemptId,
        p_attempt_token: attemptToken,
        p_events: events,
        p_final_answers: null,
      })
      if (error) throw new Error(error.message)
      return data as SubmitQuizResponse
    }

    await this.flushActions(attemptId, attemptToken, events)

    const db = loadDemoDb()
    const att = db.attempts.find((a) => a.id === attemptId && a.attempt_token === attemptToken)
    if (!att) throw new Error('INVALID_ATTEMPT')
    const campaign = db.campaigns.find((c) => c.id === att.campaign_id)!

    let score = 0
    const byStage = { LOOK: 0, THINK: 0, CONNECT: 0 }
    const review = att.selected_questions_json.map((code) => att.question_feedback_json?.[code])
    if (review.length !== 15 || review.some((item) => !item)) throw new Error('QUESTIONS_INCOMPLETE')
    const graded = review.filter((item): item is QuizReviewItem => Boolean(item))
    for (const question of graded) {
      if (question.is_correct) {
        score += 1
        byStage[question.stage] += 1
      }
    }

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - new Date(att.started_at).getTime()) / 1000)
    )
    const hasPriorValid = db.attempts.some(
      (a) =>
        a.id !== att.id &&
        a.campaign_id === att.campaign_id &&
        a.employee_code === att.employee_code &&
        a.status === 'Completed' &&
        a.is_valid_for_award
    )

    let isValid = true
    let invalidReason: string | null = null
    if (hasPriorValid) {
      isValid = false
      invalidReason = 'Lượt ôn tập (đã có lượt hợp lệ trước đó)'
    } else if (durationSeconds < campaign.min_valid_seconds) {
      isValid = false
      invalidReason = `Thời gian làm bài quá ngắn (${durationSeconds}s < ${campaign.min_valid_seconds}s)`
    }

    att.status = 'Completed'
    att.final_answers_json = Object.fromEntries(graded.map((item) => [item.question_code, item.user_answer]))
    att.score = score
    att.score_by_stage = byStage
    att.duration_seconds = durationSeconds
    att.submitted_at = new Date().toISOString()
    att.is_valid_for_award = isValid
    att.invalid_reason = invalidReason

    saveDemoDb(db)

    return {
      ok: true,
      attempt_id: att.id,
      score,
      total: att.selected_questions_json.length,
      score_by_stage: byStage,
      duration_seconds: durationSeconds,
      is_valid_for_award: isValid,
      invalid_reason: invalidReason,
      review: graded,
    }
  },

  // ==================== ADMIN & ANALYTICS QUERIES ====================
  async importEmployeeRoster(rows: EmployeeRosterEntry[]): Promise<number> {
    if (!supabase) throw new Error('Cần kết nối Supabase để nhập danh sách nhân sự.')
    const { data, error } = await supabase.rpc('import_employee_roster', { p_rows: rows })
    if (error) throw new Error(error.message)
    return data as number
  },

  async getEmployeeProgress(campaignId: string): Promise<EmployeeProgress[]> {
    if (!supabase) return []
    const rows: EmployeeProgress[] = []
    let cursor = ''
    while (true) {
      const { data, error } = await supabase.rpc('get_employee_progress', {
        p_campaign_id: campaignId, p_after_code: cursor,
      })
      if (error) throw new Error(error.message)
      const page = data as EmployeeProgress[]
      rows.push(...page)
      if (page.length < 500) return rows
      cursor = page[page.length - 1].employee_code
    }
  },

  async getEmployeeVisitLog(campaignId: string, before?: EmployeeVisit): Promise<EmployeeVisit[]> {
    if (!supabase) return []
    const { data, error } = await supabase.rpc('get_employee_visit_log', {
      p_campaign_id: campaignId, p_before: before?.verified_at, p_before_id: before?.id,
    })
    if (error) throw new Error(error.message)
    return data as EmployeeVisit[]
  },

  async getAttemptPage(page: number, search: string, pageSize: number): Promise<{ attempts: QuizAttempt[]; total: number }> {
    if (!supabase) return { attempts: [], total: 0 }
    let query = supabase.from('quiz_attempts').select(ATTEMPT_SUMMARY_COLUMNS, { count: 'exact' })
    if (search) {
      const pattern = JSON.stringify(`%${search}%`)
      query = query.or(`employee_code.ilike.${pattern},full_name.ilike.${pattern},department.ilike.${pattern}`)
    }
    const { data, count, error } = await query.order('started_at', { ascending: false }).order('id', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) throw new Error(error.message)
    return { attempts: data as QuizAttempt[], total: count ?? 0 }
  },

  async getCampaignResults(campaignId: string): Promise<QuizAttempt[]> {
    if (!supabase) return loadDemoDb().attempts.filter((attempt) => attempt.campaign_id === campaignId && attempt.status === 'Completed')
    const attempts: QuizAttempt[] = []
    let after: string | undefined
    for (;;) {
      let query = supabase.from('quiz_attempts').select(ATTEMPT_SUMMARY_COLUMNS)
        .eq('campaign_id', campaignId).eq('status', 'Completed').order('id').limit(500)
      if (after) query = query.gt('id', after)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      const page = data as QuizAttempt[]
      attempts.push(...page)
      if (page.length < 500) return attempts
      after = page[page.length - 1].id
    }
  },

  async getAttemptTimeline(attemptId: string): Promise<QuizActionEvent[]> {
    if (!supabase) return []
    const timeline: QuizActionEvent[] = []
    let cursor = 0
    while (true) {
      const { data, error } = await supabase.from('quiz_action_logs').select('*')
        .eq('attempt_id', attemptId).gt('client_seq', cursor).order('client_seq').limit(250)
      if (error) throw new Error(error.message)
      const page = data as QuizActionEvent[]
      timeline.push(...page)
      if (page.length < 250) return timeline
      cursor = page[page.length - 1].client_seq
    }
  },

  async getAdminSnapshot(): Promise<{
    users: UserProfile[]
    campaigns: Campaign[]
    questions: QuestionItem[]
    attempts: QuizAttempt[]
    actionLogs: QuizActionEvent[]
    auditLogs: AdminAuditLog[]
  }> {
    if (this.isUsingSupabase() && supabase) {
      const [uRes, cRes, qRes, aRes, lRes, audRes] = await Promise.all([
        supabase.from('users_roles').select('*').order('employee_code'),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('questions').select('*').order('question_code'),
        supabase.from('quiz_attempts').select(ATTEMPT_SUMMARY_COLUMNS).order('started_at', { ascending: false }).limit(500),
        supabase.from('quiz_action_logs').select('*').order('event_time', { ascending: false }).limit(1000),
        supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ])
      for (const response of [uRes, cRes, qRes, aRes, lRes, audRes]) {
        if (response.error) throw new Error(response.error.message)
      }
      return {
        users: (uRes.data as UserProfile[]) || [],
        campaigns: (cRes.data as Campaign[]) || [],
        questions: (qRes.data as QuestionItem[]) || [],
        attempts: (aRes.data as QuizAttempt[]) || [],
        actionLogs: (lRes.data as QuizActionEvent[]) || [],
        auditLogs: (audRes.data as AdminAuditLog[]) || [],
      }
    }
    return loadDemoDb()
  },

  async saveQuestion(question: QuestionItem, actorEmail: string): Promise<void> {
    if (this.isUsingSupabase() && supabase) {
      const { error } = await supabase.from('questions').upsert(question, { onConflict: 'question_code' })
      if (error) throw new Error(error.message)
      await supabase.from('admin_audit_logs').insert({
        actor_email: actorEmail,
        action_type: 'QUESTION_EDIT',
        target_id: question.question_code,
        changes_json: { review_status: question.review_status },
      })
      return
    }
    const db = loadDemoDb()
    const idx = db.questions.findIndex((q) => q.question_code === question.question_code)
    if (idx >= 0) db.questions[idx] = question
    else db.questions.push({ ...question, id: `q-${Date.now()}` })
    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor_email: actorEmail,
      action_type: 'QUESTION_EDIT',
      target_id: question.question_code,
      changes_json: { review_status: question.review_status, stage: question.stage },
      created_at: new Date().toISOString(),
    })
    saveDemoDb(db)
  },

  async toggleAttemptValidity(
    attemptId: string,
    isValid: boolean,
    reason: string,
    actorEmail: string
  ): Promise<void> {
    if (this.isUsingSupabase() && supabase) {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({ is_valid_for_award: isValid, invalid_reason: isValid ? null : reason })
        .eq('id', attemptId)
      if (error) throw new Error(error.message)
      await supabase.from('admin_audit_logs').insert({
        actor_email: actorEmail,
        action_type: 'ATTEMPT_INVALIDATE',
        target_id: attemptId,
        changes_json: { is_valid_for_award: isValid, reason },
      })
      return
    }
    const db = loadDemoDb()
    const att = db.attempts.find((a) => a.id === attemptId)
    if (att) {
      att.is_valid_for_award = isValid
      att.invalid_reason = isValid ? null : reason
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actor_email: actorEmail,
        action_type: 'ATTEMPT_INVALIDATE',
        target_id: attemptId,
        changes_json: { is_valid_for_award: isValid, reason },
        created_at: new Date().toISOString(),
      })
      saveDemoDb(db)
    }
  },

  async updateCampaign(campaign: Campaign, actorEmail: string): Promise<void> {
    if (this.isUsingSupabase() && supabase) {
      const { error } = await supabase.from('campaigns').upsert(campaign)
      if (error) throw new Error(error.message)
      await supabase.from('admin_audit_logs').insert({
        actor_email: actorEmail,
        action_type: 'CAMPAIGN_UPDATE',
        target_id: campaign.campaign_code,
        changes_json: { quiz_mode: campaign.quiz_mode, status: campaign.status },
      })
      return
    }
    const db = loadDemoDb()
    const idx = db.campaigns.findIndex((c) => c.id === campaign.id)
    if (idx >= 0) db.campaigns[idx] = campaign
    else db.campaigns.unshift(campaign)
    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor_email: actorEmail,
      action_type: 'CAMPAIGN_UPDATE',
      target_id: campaign.campaign_code,
      changes_json: { quiz_mode: campaign.quiz_mode, status: campaign.status },
      created_at: new Date().toISOString(),
    })
    saveDemoDb(db)
  },

  async updateUserRole(userId: string, role: UserRole, isActive: boolean, actorEmail: string): Promise<void> {
    if (this.isUsingSupabase() && supabase) {
      const { error } = await supabase.from('users_roles').update({ role, is_active: isActive }).eq('id', userId)
      if (error) throw new Error(error.message)
      await supabase.from('admin_audit_logs').insert({
        actor_email: actorEmail,
        action_type: 'ROLE_CHANGE',
        target_id: userId,
        changes_json: { role, is_active: isActive },
      })
      return
    }
    const db = loadDemoDb()
    const u = db.users.find((x) => x.id === userId)
    if (u) {
      u.role = role
      u.is_active = isActive
      db.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actor_email: actorEmail,
        action_type: 'ROLE_CHANGE',
        target_id: u.employee_code,
        changes_json: { role, is_active: isActive },
        created_at: new Date().toISOString(),
      })
      saveDemoDb(db)
    }
  },

  async upsertUsers(users: UserProfile[], actorEmail: string): Promise<number> {
    if (this.isUsingSupabase() && supabase) {
      const { error } = await supabase.from('users_roles').upsert(users, { onConflict: 'employee_code' })
      if (error) throw new Error(error.message)
      return users.length
    }
    const db = loadDemoDb()
    for (const user of users) {
      const idx = db.users.findIndex((u) => u.employee_code === user.employee_code)
      if (idx >= 0) db.users[idx] = { ...db.users[idx], ...user }
      else db.users.push({ ...user, id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })
    }
    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor_email: actorEmail,
      action_type: 'USERS_IMPORT',
      target_id: `${users.length}_users`,
      changes_json: { count: users.length },
      created_at: new Date().toISOString(),
    })
    saveDemoDb(db)
    return users.length
  },

  async loginWithSupabase(email: string, password: string): Promise<ActiveSession> {
    if (!supabase) throw new Error('Supabase chưa được cấu hình (.env)')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message || 'Đăng nhập thất bại')

    const { data: profile } = await supabase
      .from('users_roles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle()

    const user: UserProfile = profile || {
      id: data.user.id,
      employee_code: 'ADMIN',
      full_name: data.user.email || 'Admin',
      email: data.user.email,
      department: 'Management',
      employee_type: 'Office',
      role: 'admin',
      is_active: true,
    }
    const session: ActiveSession = {
      mode: 'supabase',
      user,
      loggedInAt: new Date().toISOString(),
    }
    setActiveSession(session)
    return session
  },

  resetDemo(): void {
    resetDemoDb()
  },
}
