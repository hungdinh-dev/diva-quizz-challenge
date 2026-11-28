import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, BadgeCheck, CheckCircle2, Clock, Eye, Hand, IdCard, Info, Lightbulb, ListChecks,
  MousePointerClick, Network, Play, Sparkles, Volume2, VolumeX, XCircle,
} from 'lucide-react'
import { DivaMascot, type DivaPose } from '@/components/diva/DivaMascot'
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer'
import { ResultReview } from '@/components/quiz/ResultReview'
import { LanguageToggle, useI18n } from '@/lib/i18n'
import { useQuizAudio } from '@/components/quiz/useQuizAudio'
import { localizeQuestion } from '@/data/questionEnglish'
import { ActionTracker } from '@/services/actionTracker'
import { getActiveSession, quizService } from '@/services/quizService'
import type { Campaign, QuizReviewItem, SafeQuestion, Stage, SubmitQuizResponse, UserProfile } from '@/types/quiz'

type ScreenMode = 'welcome' | 'stage_intro' | 'playing' | 'result'

const STAGE_ORDER: Stage[] = ['LOOK', 'THINK', 'CONNECT']

const STAGE_META: Record<
  Stage,
  {
    number: number
    headline: [string, string]
    subtitle: [string, string]
    verb: [string, string]
    how: [string, string]
    pose: DivaPose
    icon: typeof Eye
  }
> = {
  LOOK: {
    number: 1,
    headline: ['Nhìn kỹ từng chi tiết', 'Look for the details'],
    subtitle: ['Nhận diện linh vật, biểu tượng và thông điệp của MMV Vision 2035.', 'Recognize the mascot, symbols and messages of MMV Vision 2035.'],
    verb: ['Quan sát', 'Observe'],
    how: ['Chọn hình ảnh đúng', 'Pick the right image'],
    pose: 'explore',
    icon: Eye,
  },
  THINK: {
    number: 2,
    headline: ['Hiểu điều đứng sau biểu tượng', 'Think beyond the symbols'],
    subtitle: ['Khám phá ý nghĩa của 5X, 3C with I và tinh thần tự chủ DiVA.', 'Explore 5X, 3C with I and DiVA’s spirit of ownership.'],
    verb: ['Suy ngẫm', 'Reflect'],
    how: ['Chọn 1 đáp án đúng nhất', 'Choose the best answer'],
    pose: 'stage_think',
    icon: Lightbulb,
  },
  CONNECT: {
    number: 3,
    headline: ['Đưa tầm nhìn vào hành động', 'Put the vision into action'],
    subtitle: ['Kéo các nhãn phù hợp vào kế hoạch để xử lý tình huống tại nơi làm việc.', 'Drag the right actions into your plan to respond to situations at work.'],
    verb: ['Hành động', 'Act'],
    how: ['Kéo hoặc chạm để chọn hành động', 'Drag or tap to pick actions'],
    pose: 'running',
    icon: Network,
  },
}

const stageClass = (stage: Stage) => 'dv-stage-' + stage.toLowerCase()

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const last = parts[parts.length - 1]
  return (parts.length > 1 ? parts[0][0] + last[0] : last.slice(0, 2)).toUpperCase()
}

export const QuizPage: React.FC = () => {
  const { locale, t } = useI18n()
  const [screen, setScreen] = useState<ScreenMode>('welcome')
  const [employeeCode, setEmployeeCode] = useState('')
  const [verificationToken, setVerificationToken] = useState<string>()
  const [authError, setAuthError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const [verifiedUser, setVerifiedUser] = useState<UserProfile | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [attemptUnavailable, setAttemptUnavailable] = useState(false)
  const [hasInProgress, setHasInProgress] = useState(false)

  const [attemptId, setAttemptId] = useState<string>('')
  const [attemptToken, setAttemptToken] = useState<string>('')
  const [questions, setQuestions] = useState<SafeQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<Record<string, QuizReviewItem>>({})
  const [changeCounts, setChangeCounts] = useState<Record<string, number>>({})
  const [elapsedSec, setElapsedSec] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitQuizResponse | null>(null)
  const audio = useQuizAudio(screen === 'stage_intro' || screen === 'playing')
  const controls = (
    <div className="flex items-center gap-2">
      <LanguageToggle className="dv-pill-control" />
      <button type="button" aria-pressed={audio.enabled} onClick={audio.toggle}
        aria-label={audio.enabled ? t('Tắt âm thanh', 'Mute sound') : t('Bật âm thanh', 'Unmute sound')}
        className="dv-icon-btn">
        {audio.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  )

  const readableError = (message: string) => {
    if (message === 'ATTEMPT_USED') return t('Mã nhân viên này đã sử dụng lượt khảo sát.', 'This employee ID has already used its survey attempt.')
    if (message === 'INVALID_ANSWER') return t('Vui lòng chọn đủ đáp án hợp lệ.', 'Select the required number of valid answers.')
    if (message === 'QUESTION_UNAVAILABLE' || message === 'QUESTION_OUT_OF_ORDER' || message === 'QUESTIONS_INCOMPLETE') {
      return t('Hãy kiểm tra tiến độ và xác nhận lần lượt từng câu.', 'Check your progress and confirm each answer in order.')
    }
    if (message === 'INVALID_ATTEMPT') return t('Phiên làm bài đã hết hiệu lực.', 'Your survey session is no longer valid.')
    if (locale === 'en' && message.startsWith('Mã nhân viên không')) return 'Employee ID not found.'
    if (locale === 'en' && /chưa có (đợt|chiến dịch)/i.test(message)) return 'No survey is open at the moment.'
    return message
  }

  const trackerRef = useRef<ActionTracker | null>(null)
  const questionShownAtRef = useRef<number>(Date.now())
  const blurStartRef = useRef<number | null>(null)
  const feedbackRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const sess = getActiveSession()
    if (sess && sess.user.employee_code) {
      setEmployeeCode(sess.user.employee_code)
    }
  }, [])

  useEffect(() => {
    if (screen !== 'playing' && screen !== 'stage_intro') return
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1)
    }, 1000)

    const onVisibilityChange = () => {
      const tracker = trackerRef.current
      const q = questions[currentIndex]
      if (!tracker) return
      if (document.hidden) {
        blurStartRef.current = Date.now()
        tracker.record('TAB_BLUR', q?.stage || 'INTRO', { questionCode: q?.question_code })
      } else if (blurStartRef.current) {
        const awayMs = Date.now() - blurStartRef.current
        blurStartRef.current = null
        tracker.record('TAB_FOCUS', q?.stage || 'INTRO', {
          questionCode: q?.question_code,
          payload: { awayMs },
        })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [screen, currentIndex, questions])

  const currentQuestion = questions[currentIndex]


  const handleVerifyEmployee = async (codeOverride?: string) => {
    if (verifying) return
    const targetCode = (codeOverride ?? employeeCode).trim()
    if (!targetCode) {
      setAuthError(t('Vui lòng nhập mã nhân viên.', 'Enter your employee ID.'))
      return
    }
    setAuthError(null)
    setVerifying(true)
    try {
      const res = await quizService.verifyEmployee(targetCode)
      if (!res.ok || !res.user || !res.campaign) {
        setAuthError(res.error || t('Không thể xác thực nhân viên.', 'Could not verify the employee ID.'))
        return
      }
      setVerifiedUser(res.user)
      setVerificationToken(res.verificationToken)
      setCampaign(res.campaign)
      setAttemptUnavailable(Boolean(res.attemptUnavailable || res.completedAttempts))
      setHasInProgress(Boolean(res.inProgressAttemptId))
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Không thể xác thực nhân viên.')
    } finally {
      setVerifying(false)
    }
  }

  const handleStartQuiz = async () => {
    if (!verifiedUser || !campaign || attemptUnavailable || verifying) return
    setAuthError(null)
    setVerifying(true)
    try {
      const deviceType = window.innerWidth < 768 ? 'Mobile' : 'Desktop'
      const started = await quizService.startAttempt(campaign.id, verifiedUser.employee_code, deviceType, verificationToken)
      if (!started.questions.length) throw new Error('Lượt làm bài chưa có câu hỏi.')
      setAttemptId(started.attemptId)
      setAttemptToken(started.attemptToken)
      setQuestions(started.questions)
      setAnswers(started.draftAnswers || {})
      setFeedback(started.feedback)
      setChangeCounts({})

      const firstUnanswered = started.questions.findIndex((q) => !started.feedback[q.question_code])
      const startIdx = firstUnanswered >= 0 ? firstUnanswered : started.questions.length - 1
      setCurrentIndex(startIdx)
      setElapsedSec(
        Math.max(0, Math.round((Date.now() - new Date(started.startedAt).getTime()) / 1000))
      )

      const tracker = new ActionTracker(started.attemptId, started.attemptToken, verifiedUser.employee_code, started.lastEventSeq)
      trackerRef.current = tracker
      tracker.record('SESSION_START', 'INTRO', {
        payload: {
          deviceType,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          resumed: started.resumed,
        },
      })

      const firstStage = started.questions[startIdx]?.stage || 'LOOK'
      tracker.record('STAGE_ENTER', firstStage, {
        payload: { stage: firstStage },
      })
      await tracker.flush(started.draftAnswers)

      setScreen('stage_intro')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Không thể bắt đầu bài thi.')
    } finally {
      setVerifying(false)
    }
  }

  const enterPlayingCurrentQuestion = () => {
    const q = questions[currentIndex]
    if (q && trackerRef.current) {
      questionShownAtRef.current = Date.now()
      trackerRef.current.record('QUESTION_VIEW', q.stage, {
        questionCode: q.question_code,
        payload: { questionIndex: currentIndex + 1 },
      })
    }
    setScreen('playing')
  }

  const handleSelectAnswer = (keys: string[]) => {
    if (!currentQuestion || submitting || feedback[currentQuestion.question_code]) return
    const prev = answers[currentQuestion.question_code] || []
    const tracker = trackerRef.current
    if (tracker) {
      const timeFromView = Date.now() - questionShownAtRef.current
      if (prev.length === 0 && keys.length > 0) {
        tracker.record('OPTION_SELECT', currentQuestion.stage, {
          questionCode: currentQuestion.question_code,
          payload: { selected: keys },
          timeSpentMs: timeFromView,
        })
      } else if (JSON.stringify(prev) !== JSON.stringify(keys)) {
        tracker.record('OPTION_CHANGE', currentQuestion.stage, {
          questionCode: currentQuestion.question_code,
          payload: { from: prev, to: keys },
          timeSpentMs: timeFromView,
        })
        setChangeCounts((c) => ({
          ...c,
          [currentQuestion.question_code]: (c[currentQuestion.question_code] || 0) + 1,
        }))
      }
    }
    setAnswers((curr) => ({ ...curr, [currentQuestion.question_code]: keys }))
  }

  const handleNextOrSubmit = async () => {
    if (!currentQuestion || !trackerRef.current || submitting) return
    setSubmitting(true)
    setAuthError(null)
    const timeSpentMs = Date.now() - questionShownAtRef.current
    const currentSelected = answers[currentQuestion.question_code] || []

    if (!feedback[currentQuestion.question_code]) {
      try {
        const result = await quizService.answerQuestion(attemptId, attemptToken, currentQuestion.question_code, currentSelected)
        setFeedback((previous) => ({ ...previous, [result.question_code]: result }))
        const nextAnswers = { ...answers, [result.question_code]: result.user_answer }
        setAnswers(nextAnswers)
        trackerRef.current.record('ANSWER_SUBMIT', currentQuestion.stage, {
          questionCode: result.question_code, payload: { finalSelected: result.user_answer }, timeSpentMs,
        })
        void trackerRef.current.flush(nextAnswers)
        audio.feedback(result.is_correct)
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : t('Không thể chấm câu hỏi.', 'Could not check this answer.'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    const isLast = currentIndex >= questions.length - 1
    if (!isLast) {
      const nextIdx = currentIndex + 1
      const nextQuestion = questions[nextIdx]
      const stageChanged = nextQuestion.stage !== currentQuestion.stage

      setSubmitting(false)
      setCurrentIndex(nextIdx)

      if (stageChanged) {
        trackerRef.current.record('STAGE_ENTER', nextQuestion.stage, {
          payload: { stage: nextQuestion.stage },
        })
        setScreen('stage_intro')
      } else {
        questionShownAtRef.current = Date.now()
        trackerRef.current.record('QUESTION_VIEW', nextQuestion.stage, {
          questionCode: nextQuestion.question_code,
          payload: { questionIndex: nextIdx + 1 },
        })
      }
      return
    }

    try {
      trackerRef.current.record('QUIZ_SUBMIT', 'RESULT', {
        payload: { totalQuestions: questions.length },
      })
      const pendingEvents = trackerRef.current.drainAllPending()
      const res = await quizService.submitAttempt(attemptId, attemptToken, pendingEvents)
      trackerRef.current.clearStorage()
      setSubmitResult(res)
      setScreen('result')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Nộp bài thất bại, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewExplanation = (questionCode: string, filterMode: string) => {
    trackerRef.current?.record('EXPLANATION_VIEW', 'RESULT', {
      questionCode,
      payload: { filterMode },
    })
    void trackerRef.current?.flush()
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const stageCounts = useMemo(() => {
    const counts: Record<Stage, number> = { LOOK: 0, THINK: 0, CONNECT: 0 }
    questions.forEach((q) => { counts[q.stage] += 1 })
    return counts
  }, [questions])
  const answeredCount = Object.keys(feedback).length
  const currentGradedCode = currentQuestion && feedback[currentQuestion.question_code] ? currentQuestion.question_code : null

  // Bring the grading feedback into view (it can sit below the fixed action bar on small screens)
  useEffect(() => {
    if (!currentGradedCode) return
    const frame = window.requestAnimationFrame(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    return () => window.cancelAnimationFrame(frame)
  }, [currentGradedCode])

  // Start each new question at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [currentIndex, screen])

  // ==================== WELCOME ====================
  if (screen === 'welcome') {
    const showError = Boolean(authError)
    return (
      <main className="dv-welcome">
        <div className="dv-welcome-top">{controls}</div>
        <div className="dv-welcome-main">
          <div className="dv-welcome-art dv-enter">
            <img src="/assets/vision2035/background.webp" alt="DiVA Vision Explorer" draggable={false} />
          </div>

          <section className="dv-card dv-welcome-card dv-enter-2" aria-labelledby="welcome-title">
            {!verifiedUser ? (
              <>
                <p className="dv-eyebrow text-diva-red">MMV Vision 2035</p>
                <h1 id="welcome-title" className="mt-1.5 font-display text-[2rem] font-extrabold leading-[1.05] sm:text-[2.35rem]">
                  {t('Sẵn sàng khám phá cùng DiVA?', 'Ready to explore with DiVA?')}
                </h1>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-[color:var(--dv-ink-soft)]">
                  {t('Hành trình 15 câu hỏi qua ba chặng để hiểu rõ hơn tầm nhìn MMV Vision 2035.',
                    'A 15-question journey across three stages to discover MMV Vision 2035.')}
                </p>

                <ol className="dv-journey mt-4" aria-label={t('Ba chặng khảo sát', 'Three survey stages')}>
                  {STAGE_ORDER.map((stage) => {
                    const item = STAGE_META[stage]
                    const Icon = item.icon
                    return (
                      <li key={stage} className={'dv-journey-item ' + stageClass(stage)}>
                        <span className="dv-journey-icon"><Icon className="h-4 w-4" aria-hidden /></span>
                        <span className="dv-journey-name">{stage}</span>
                        <span className="dv-journey-desc">{t(...item.verb)}</span>
                      </li>
                    )
                  })}
                </ol>

                <p className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem] font-semibold text-[color:var(--dv-ink-soft)]">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-diva-red" aria-hidden />{t('8–10 phút', '8–10 minutes')}</span>
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-diva-red" aria-hidden />{t('Một lượt mỗi nhân viên', 'One attempt per employee')}</span>
                </p>

                <form className="mt-5 space-y-2.5" noValidate onSubmit={(event) => { event.preventDefault(); void handleVerifyEmployee() }}>
                  <label htmlFor="emp-code" className="block text-sm font-extrabold">{t('Mã nhân viên', 'Employee ID')}</label>
                  <div className="dv-field">
                    <IdCard aria-hidden />
                    <input id="emp-code" className="dv-input" value={employeeCode} autoComplete="off" autoCapitalize="characters"
                      spellCheck={false} placeholder={t('Ví dụ: MMV0101', 'e.g. MMV0101')} aria-invalid={showError}
                      aria-describedby={showError ? 'emp-error' : undefined}
                      onChange={(event) => { setEmployeeCode(event.target.value); if (authError) setAuthError(null) }} />
                  </div>
                  {showError && (
                    <p id="emp-error" role="alert" className="dv-error"><AlertCircle aria-hidden />{readableError(authError!)}</p>
                  )}
                  <button type="submit" className="dv-btn dv-btn-block dv-btn-lg" disabled={verifying}>
                    {verifying ? t('Đang kiểm tra…', 'Checking…') : t('Tiếp tục', 'Continue')}
                    {!verifying && <ArrowRight className="h-5 w-5" aria-hidden />}
                  </button>
                  {quizService.isDemoAvailable() && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-semibold text-[color:var(--dv-ink-soft)]">
                      <span>{t('Mã dùng thử:', 'Demo IDs:')}</span>
                      {['MMV0101', 'MMV0102', 'MMV0202'].map((code) => (
                        <button key={code} type="button" className="dv-demo-chip"
                          onClick={() => { setEmployeeCode(code); void handleVerifyEmployee(code) }}>{code}</button>
                      ))}
                    </div>
                  )}
                </form>
              </>
            ) : (
              <div className="dv-enter">
                <p className="dv-eyebrow text-diva-red">{t('Đã xác nhận', 'Verified')}</p>
                <h1 id="welcome-title" className="mt-1.5 font-display text-[2rem] font-extrabold leading-[1.05]">
                  {t('Xin chào, ', 'Hello, ')}{verifiedUser.full_name.split(/\s+/).slice(-1)[0]}!
                </h1>
                <div className="dv-profile mt-4">
                  <span className="dv-avatar" aria-hidden>{initials(verifiedUser.full_name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{verifiedUser.full_name}</p>
                    <p className="text-sm font-semibold leading-snug text-[color:var(--dv-ink-soft)]">{verifiedUser.employee_code}</p>
                    {verifiedUser.department && (
                      <p className="text-sm font-semibold leading-snug text-[color:var(--dv-ink-soft)]">{verifiedUser.department}</p>
                    )}
                  </div>
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[color:var(--dv-ok)]" aria-hidden />
                </div>

                {attemptUnavailable ? (
                  <p className="dv-notice mt-4"><Info aria-hidden />{t('Mã nhân viên này đã sử dụng lượt khảo sát. Cảm ơn bạn đã tham gia!', 'This employee ID has already used its survey attempt. Thank you for taking part!')}</p>
                ) : (
                  <>
                    <p className="mt-5 text-sm font-extrabold">{t('Cách tham gia', 'How it works')}</p>
                    <ol className="dv-howto mt-2">
                      <li>{t('Chọn đáp án cho từng câu hỏi', 'Choose an answer for each question')}</li>
                      <li>{t('Bấm “Xác nhận” để xem đúng / sai ngay', 'Press “Check answer” to see the result instantly')}</li>
                      <li>{t('Đáp án đã xác nhận không thể sửa lại', 'Confirmed answers can’t be changed')}</li>
                    </ol>
                    <button type="button" className="dv-btn dv-btn-block dv-btn-lg mt-5" disabled={verifying} onClick={handleStartQuiz}>
                      <Play className="h-5 w-5 fill-current" aria-hidden />
                      {verifying ? t('Đang chuẩn bị…', 'Preparing…') : hasInProgress ? t('Tiếp tục bài đang làm', 'Resume survey') : t('Bắt đầu khảo sát', 'Start survey')}
                    </button>
                  </>
                )}
                {authError && <p role="alert" className="dv-error mt-3"><AlertCircle aria-hidden />{readableError(authError)}</p>}
                <div className="mt-4 text-center">
                  <button type="button" className="dv-link-btn" onClick={() => {
                    setVerifiedUser(null); setVerificationToken(undefined); setAuthError(null)
                  }}>{t('Không phải bạn? Dùng mã khác', 'Not you? Use another ID')}</button>
                </div>
              </div>
            )}
          </section>
        </div>
        <footer className="dv-welcome-footer">
          <Link to="/secret-login" className="underline underline-offset-4">{t('Cổng quản trị', 'Admin portal')}</Link>
        </footer>
      </main>
    )
  }

  // ==================== RESULT ====================
  if (screen === 'result' && submitResult && verifiedUser) {
    return (
      <ResultReview result={submitResult} controls={controls} employeeName={verifiedUser.full_name}
        employeeCode={verifiedUser.employee_code} department={verifiedUser.department}
        onViewExplanation={handleViewExplanation} onReturnHome={() => {
          setVerifiedUser(null); setSubmitResult(null); setVerificationToken(undefined); setScreen('welcome')
        }} />
    )
  }

  if (!currentQuestion) return null
  const stage = currentQuestion.stage
  const meta = STAGE_META[stage]
  const StageIcon = meta.icon

  // ==================== STAGE INTRO ====================
  if (screen === 'stage_intro') {
    const currentOrder = STAGE_ORDER.indexOf(stage)
    return (
      <main className={'dv-stage ' + stageClass(stage)}>
        <header className="dv-stage-top">
          <span className="dv-brand"><img src="/assets/vision2035/welcome.webp" alt="" aria-hidden /><span className="hidden sm:inline">DiVA Vision Explorer</span></span>
          {controls}
        </header>
        <div className="dv-stage-main">
          <section className="dv-enter-2">
            <ol className="dv-steps" aria-label={t('Tiến độ theo chặng', 'Stage progress')}>
              {STAGE_ORDER.map((item, idx) => (
                <React.Fragment key={item}>
                  {idx > 0 && <li aria-hidden className="dv-step-line" />}
                  <li className={'dv-step ' + (idx < currentOrder ? 'is-done' : idx === currentOrder ? 'is-current' : '')}
                    aria-current={idx === currentOrder ? 'step' : undefined}>
                    <span className="dv-step-dot">{idx < currentOrder ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : idx + 1}</span>
                    <span className="dv-step-label">{item}</span>
                  </li>
                </React.Fragment>
              ))}
            </ol>

            <p className="dv-eyebrow mt-7 text-[color:var(--stage-light)]">
              {t('Chặng', 'Stage')} {meta.number} / {STAGE_ORDER.length} · {stage}
            </p>
            <h1 className="dv-stage-title mt-2 max-w-xl">{t(...meta.headline)}</h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">{t(...meta.subtitle)}</p>

            <div className="dv-stage-facts mt-6">
              <span className="dv-fact"><ListChecks aria-hidden />{stageCounts[stage]} {t('câu hỏi', 'questions')}</span>
              <span className="dv-fact">{stage === 'CONNECT' ? <Hand aria-hidden /> : <MousePointerClick aria-hidden />}{t(...meta.how)}</span>
            </div>

            <button type="button" className="dv-btn dv-btn-lg mt-8" onClick={enterPlayingCurrentQuestion}>
              {currentOrder === 0 && answeredCount === 0 ? t('Bắt đầu chặng ', 'Start ') : t('Vào chặng ', 'Enter ')}{stage}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>

            {answeredCount > 0 && (
              <div className="dv-overall mt-7">
                <span>{t('Đã hoàn thành', 'Completed')} {answeredCount}/{questions.length}</span>
                <span className="dv-overall-bar"><span style={{ width: (answeredCount / questions.length) * 100 + '%' }} /></span>
              </div>
            )}
          </section>

          <div className="dv-stage-art dv-enter" aria-hidden="true">
            <div className="dv-stage-disc">
              <DivaMascot pose={meta.pose} size="xl" className="!h-[94%] !w-[94%]" />
            </div>
            <span className="dv-stage-badge"><span><small>{t('CHẶNG', 'STAGE')}</small><b>0{meta.number}</b></span></span>
          </div>
        </div>
      </main>
    )
  }

  // ==================== PLAYING ====================
  const graded = feedback[currentQuestion.question_code]
  const shownQuestion = localizeQuestion(currentQuestion, locale)
  const currentSelected = graded?.user_answer ?? answers[currentQuestion.question_code] ?? []
  const required = currentQuestion.question_type === 'ACTION_BUILDER'
    ? currentQuestion.options_json[0]?.selectionLimit ?? 1
    : 1
  const canProceed = Boolean(graded) || currentSelected.length === required
  const correctLabels = graded?.correct_answer.map((key) => shownQuestion.options_json.find((option) => option.key === key)?.text ?? key)
  const isLast = currentIndex === questions.length - 1
  const nextStageChanges = !isLast && questions[currentIndex + 1]?.stage !== stage

  const hint = graded
    ? (graded.is_correct ? t('Tuyệt vời! Tiếp tục nào.', 'Great job! Let’s keep going.') : t('Không sao, xem đáp án rồi đi tiếp nhé.', 'No worries — check the answer and move on.'))
    : currentQuestion.question_type === 'ACTION_BUILDER'
      ? t('Đã chọn ' + currentSelected.length + '/' + required + ' hành động', currentSelected.length + '/' + required + ' actions selected')
      : currentSelected.length
        ? t('Bấm “Xác nhận” để kiểm tra', 'Press “Check answer” to continue')
        : t('Chọn 1 đáp án', 'Choose one answer')

  let segIndex = -1
  return (
    <main className={'dv-play ' + stageClass(stage)}>
      <header className="dv-topbar">
        <div className="dv-topbar-inner">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="dv-stage-chip"><StageIcon aria-hidden />{stage}</span>
            <span className="whitespace-nowrap text-sm font-extrabold">
              {t('Câu', 'Q')} {currentIndex + 1}<span className="text-[color:var(--dv-ink-soft)]">/{questions.length}</span>
            </span>
          </div>
          <div className="dv-progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount}
            aria-label={t('Tiến độ khảo sát', 'Survey progress')}>
            {STAGE_ORDER.filter((s) => stageCounts[s] > 0).map((s) => (
              <div key={s} className="dv-progress-group" style={{ '--n': stageCounts[s] } as React.CSSProperties}>
                {questions.filter((q) => q.stage === s).map((q) => {
                  segIndex += 1
                  const done = Boolean(feedback[q.question_code])
                  const current = segIndex === currentIndex
                  return (
                    <span key={q.question_code}
                      className={'dv-progress-seg ' + (current && !done ? 'is-current' : done ? 'is-done' : '')}
                      style={{ '--seg-color': 'var(--dv-' + s.toLowerCase() + ')' } as React.CSSProperties} />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="dv-timer hidden sm:inline-flex" aria-label={t('Thời gian', 'Time')}><Clock className="h-4 w-4" aria-hidden />{formatTimer(elapsedSec)}</span>
            {controls}
          </div>
        </div>
      </header>

      <div className="dv-play-main">
        <QuestionRenderer key={currentQuestion.question_code} question={shownQuestion} questionIndex={currentIndex}
          questionNumber={currentIndex + 1} selectedKeys={currentSelected}
          changeCount={changeCounts[currentQuestion.question_code] || 0}
          correctKeys={graded?.correct_answer} disabled={Boolean(graded) || submitting} onSelect={handleSelectAnswer} />

        {graded && (
          <section ref={feedbackRef} role="status" className={'dv-feedback ' + (graded.is_correct ? 'is-correct' : 'is-incorrect')}>
            <DivaMascot pose={graded.is_correct ? 'cheering' : 'sad'} size="sm" className="dv-feedback-mascot" />
            <div className="min-w-0">
              <h2 className="dv-feedback-title flex items-center gap-2">
                {graded.is_correct ? <CheckCircle2 className="h-6 w-6" aria-hidden /> : <XCircle className="h-6 w-6" aria-hidden />}
                {graded.is_correct ? t('Chính xác!', 'Correct!') : t('Chưa chính xác', 'Not quite')}
              </h2>
              {!graded.is_correct && correctLabels && (
                <p className="mt-1.5 text-[0.95rem] font-semibold">
                  {t('Đáp án đúng', 'Correct answer')}: <span className="font-extrabold">{correctLabels.join(' · ')}</span>
                </p>
              )}
              {locale === 'vi' && graded.stage === 'CONNECT' && graded.explanation && (
                <p className="mt-1.5 text-sm leading-relaxed">{graded.explanation}</p>
              )}
            </div>
          </section>
        )}

        {authError && <p role="alert" className="dv-error mt-4"><AlertCircle aria-hidden />{readableError(authError)}</p>}
      </div>

      <footer className="dv-actionbar">
        <div className="dv-actionbar-inner">
          <p className="dv-hint" aria-live="polite">
            {graded ? (graded.is_correct ? <Sparkles className="text-diva-orange" aria-hidden /> : <Info aria-hidden />) : <MousePointerClick aria-hidden />}
            <span className="line-clamp-2">{hint}</span>
          </p>
          <button type="button" className={'dv-btn ' + (graded ? 'dv-btn-ink' : '')} disabled={!canProceed || submitting} onClick={handleNextOrSubmit}>
            {submitting ? t('Đang xử lý…', 'Working…') : !graded ? t('Xác nhận', 'Check answer')
              : isLast ? t('Xem kết quả', 'See results') : nextStageChanges ? t('Sang chặng tiếp', 'Next stage') : t('Câu tiếp theo', 'Next')}
            {!submitting && <ArrowRight className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </footer>
    </main>
  )
}
