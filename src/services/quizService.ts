import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { loadDemoDb, resetDemoDb, saveDemoDb } from '@/services/demoStore'
import type {
  AdminAuditLog,
  Campaign,
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

function stripQuestionSecrets(q: QuestionItem): SafeQuestion {
  const { correct_answer_json: _c, explanation: _e, review_status: _r, ...safe } = q
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

  async verifyEmployee(employeeCode: string, pin?: string): Promise<{
    ok: boolean
    error?: string
    user?: UserProfile
    campaign?: Campaign
    completedAttempts?: number
    inProgressAttemptId?: string | null
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
        inProgressAttemptId: data.in_progress_attempt_id,
      }
    }

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
    const userAttempts = db.attempts.filter(
      (a) => a.campaign_id === campaign.id && a.employee_code === user.employee_code
    )
    const inProg = userAttempts.find((a) => a.status === 'InProgress')
    const completed = userAttempts.filter((a) => a.status === 'Completed').length

    return {
      ok: true,
      user,
      campaign,
      completedAttempts: completed,
      inProgressAttemptId: inProg?.id ?? null,
    }
  },

  async startAttempt(
    campaignId: string,
    employeeCode: string,
    deviceType: 'Mobile' | 'Desktop'
  ): Promise<{
    attemptId: string
    attemptToken: string
    attemptNumber: number
    startedAt: string
    draftAnswers: Record<string, string[]>
    resumed: boolean
    questions: SafeQuestion[]
  }> {
    if (this.isUsingSupabase() && supabase) {
      const { data, error } = await supabase.rpc('start_quiz_attempt', {
        p_campaign_id: campaignId,
        p_employee_code: employeeCode,
        p_device_type: deviceType,
      })
      if (error) throw new Error(error.message)
      return {
        attemptId: data.attempt_id,
        attemptToken: data.attempt_token,
        attemptNumber: data.attempt_number,
        startedAt: data.started_at,
        draftAnswers: data.draft_answers || {},
        resumed: Boolean(data.resumed),
        questions: data.questions || [],
      }
    }

    const db = loadDemoDb()
    const user = db.users.find((u) => u.employee_code === employeeCode)
    const campaign = db.campaigns.find((c) => c.id === campaignId)
    if (!user || !campaign) throw new Error('Dữ liệu người dùng hoặc chiến dịch không hợp lệ.')

    const existing = db.attempts.find(
      (a) => a.campaign_id === campaignId && a.employee_code === employeeCode && a.status === 'InProgress'
    )
    if (existing) {
      const qList = existing.selected_questions_json
        .map((code) => db.questions.find((q) => q.question_code === code))
        .filter((q): q is QuestionItem => Boolean(q))
        .map(stripQuestionSecrets)
      return {
        attemptId: existing.id,
        attemptToken: existing.attempt_token || existing.id,
        attemptNumber: existing.attempt_number,
        startedAt: existing.started_at,
        draftAnswers: existing.draft_answers_json || {},
        resumed: true,
        questions: qList,
      }
    }

    const prevCount = db.attempts.filter(
      (a) => a.campaign_id === campaignId && a.employee_code === employeeCode
    ).length
    if (campaign.max_attempts > 0 && prevCount >= campaign.max_attempts) {
      throw new Error(`Bạn đã sử dụng hết ${campaign.max_attempts} lượt làm bài cho phép.`)
    }

    const approved = db.questions.filter((q) => q.review_status === 'Da_duyet')
    const filterByMode = (stage: 'LOOK' | 'THINK' | 'CONNECT', limit: number) => {
      let pool = approved.filter((q) => q.stage === stage)
      if (campaign.quiz_mode === 'Set_A') pool = pool.filter((q) => q.source_set === 'Bo_A')
      if (campaign.quiz_mode === 'Set_B') pool = pool.filter((q) => q.source_set === 'Bo_B')
      if (campaign.quiz_mode === 'Random_Pool_15') {
        pool = [...pool].sort(() => Math.random() - 0.5)
      }
      return pool.slice(0, limit)
    }

    const picked = [
      ...filterByMode('LOOK', campaign.stage_mix.LOOK),
      ...filterByMode('THINK', campaign.stage_mix.THINK),
      ...filterByMode('CONNECT', campaign.stage_mix.CONNECT),
    ]

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
      attempt_number: prevCount + 1,
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
      resumed: false,
      questions: picked.map(stripQuestionSecrets),
    }
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
    finalAnswers: Record<string, string[]>
  ): Promise<SubmitQuizResponse> {
    if (this.isUsingSupabase() && supabase) {
      const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        p_attempt_id: attemptId,
        p_attempt_token: attemptToken,
        p_events: events,
        p_final_answers: finalAnswers,
      })
      if (error) throw new Error(error.message)
      return data as SubmitQuizResponse
    }

    await this.flushActions(attemptId, attemptToken, events, finalAnswers)

    const db = loadDemoDb()
    const att = db.attempts.find((a) => a.id === attemptId)
    if (!att) throw new Error('Không tìm thấy lượt làm bài.')
    const campaign = db.campaigns.find((c) => c.id === att.campaign_id)!

    let score = 0
    const byStage = { LOOK: 0, THINK: 0, CONNECT: 0 }
    const review: QuizReviewItem[] = []

    for (const code of att.selected_questions_json) {
      const q = db.questions.find((item) => item.question_code === code)
      if (!q) continue
      const userAns = finalAnswers[code] || []
      const correctAns = q.correct_answer_json.keys || []
      const isCorrect = arraysEqual(userAns, correctAns)
      if (isCorrect) {
        score += 1
        byStage[q.stage] += 1
      }
      review.push({
        question_code: q.question_code,
        stage: q.stage,
        concept: q.concept,
        prompt_text: q.prompt_text,
        options_json: q.options_json,
        user_answer: userAns,
        correct_answer: correctAns,
        is_correct: isCorrect,
        explanation: q.explanation,
      })
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
    att.final_answers_json = finalAnswers
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
      review,
    }
  },

  // ==================== ADMIN & ANALYTICS QUERIES ====================
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
        supabase.from('quiz_attempts').select('*').order('started_at', { ascending: false }).limit(500),
        supabase.from('quiz_action_logs').select('*').order('event_time', { ascending: false }).limit(1000),
        supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ])
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

  async bulkImportQuestions(items: QuestionItem[], actorEmail: string): Promise<number> {
    for (const item of items) {
      await this.saveQuestion(item, actorEmail)
    }
    return items.length
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
