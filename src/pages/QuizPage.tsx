import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, Compass, Play, Sparkles, UserCheck } from 'lucide-react'
import { DivaMascot } from '@/components/diva/DivaMascot'
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer'
import { ResultReview } from '@/components/quiz/ResultReview'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionTracker } from '@/services/actionTracker'
import { getActiveSession, quizService } from '@/services/quizService'
import type { Campaign, SafeQuestion, Stage, SubmitQuizResponse, UserProfile } from '@/types/quiz'

type ScreenMode = 'welcome' | 'stage_intro' | 'playing' | 'result'

const STAGE_META: Record<
  Stage,
  { title: string; subtitle: string; badge: string; pose: 'explore' | 'thinking' | 'pointing' }
> = {
  LOOK: {
    title: 'Chặng 1: LOOK',
    subtitle: 'Nhìn và nhận diện biểu tượng, màu sắc, thông điệp MMV Vision 2035',
    badge: 'bg-diva-red text-white',
    pose: 'explore',
  },
  THINK: {
    title: 'Chặng 2: THINK',
    subtitle: 'Hiểu sâu ý nghĩa 5X, 3C with I và tinh thần tự chủ DiVA',
    badge: 'bg-diva-blue text-white',
    pose: 'thinking',
  },
  CONNECT: {
    title: 'Chặng 3: CONNECT',
    subtitle: 'Liên hệ các tình huống thực tế ngay trong công việc hằng ngày',
    badge: 'bg-diva-green text-diva-ink',
    pose: 'pointing',
  },
}

export const QuizPage: React.FC = () => {
  const [screen, setScreen] = useState<ScreenMode>('welcome')
  const [employeeCode, setEmployeeCode] = useState('')
  const [pin, setPin] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const [verifiedUser, setVerifiedUser] = useState<UserProfile | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [completedAttempts, setCompletedAttempts] = useState(0)
  const [hasInProgress, setHasInProgress] = useState(false)

  const [attemptId, setAttemptId] = useState<string>('')
  const [attemptToken, setAttemptToken] = useState<string>('')
  const [questions, setQuestions] = useState<SafeQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [elapsedSec, setElapsedSec] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitQuizResponse | null>(null)

  const trackerRef = useRef<ActionTracker | null>(null)
  const questionShownAtRef = useRef<number>(Date.now())
  const blurStartRef = useRef<number | null>(null)

  // Auto-prefill if user came from /secret-login as an employee
  useEffect(() => {
    const sess = getActiveSession()
    if (sess && sess.user.employee_code) {
      setEmployeeCode(sess.user.employee_code)
    }
  }, [])

  // Timer & TAB_BLUR / TAB_FOCUS telemetry during active quiz
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

  const stageQuestionsInfo = useMemo(() => {
    if (!currentQuestion) return { posInStage: 1, stageTotal: 1 }
    const sameStage = questions.filter((q) => q.stage === currentQuestion.stage)
    const posInStage = sameStage.findIndex((q) => q.question_code === currentQuestion.question_code) + 1
    return { posInStage, stageTotal: sameStage.length }
  }, [questions, currentQuestion])

  const handleVerifyEmployee = async (codeOverride?: string) => {
    const targetCode = (codeOverride ?? employeeCode).trim()
    if (!targetCode) {
      setAuthError('Vui lòng nhập Mã nhân viên để bắt đầu.')
      return
    }
    setAuthError(null)
    setVerifying(true)
    try {
      const res = await quizService.verifyEmployee(targetCode, pin)
      if (!res.ok || !res.user || !res.campaign) {
        setAuthError(res.error || 'Không thể xác thực nhân viên.')
        return
      }
      setVerifiedUser(res.user)
      setCampaign(res.campaign)
      setCompletedAttempts(res.completedAttempts || 0)
      setHasInProgress(Boolean(res.inProgressAttemptId))
    } finally {
      setVerifying(false)
    }
  }

  const handleStartQuiz = async () => {
    if (!verifiedUser || !campaign) return
    setAuthError(null)
    setVerifying(true)
    try {
      const deviceType = window.innerWidth < 768 ? 'Mobile' : 'Desktop'
      const started = await quizService.startAttempt(campaign.id, verifiedUser.employee_code, deviceType)
      setAttemptId(started.attemptId)
      setAttemptToken(started.attemptToken)
      setQuestions(started.questions)
      setAnswers(started.draftAnswers || {})

      // Resume to first unanswered question if resumed
      let startIdx = 0
      if (started.resumed && started.questions.length > 0) {
        const firstUnanswered = started.questions.findIndex(
          (q) => !(started.draftAnswers?.[q.question_code]?.length)
        )
        startIdx = firstUnanswered >= 0 ? firstUnanswered : 0
      }
      setCurrentIndex(startIdx)
      setElapsedSec(
        Math.max(0, Math.round((Date.now() - new Date(started.startedAt).getTime()) / 1000))
      )

      const tracker = new ActionTracker(started.attemptId, started.attemptToken, verifiedUser.employee_code)
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
    if (!currentQuestion) return
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
      }
    }
    setAnswers((curr) => ({ ...curr, [currentQuestion.question_code]: keys }))
  }

  const handleNextOrSubmit = async () => {
    if (!currentQuestion || !trackerRef.current) return
    const timeSpentMs = Date.now() - questionShownAtRef.current
    const currentSelected = answers[currentQuestion.question_code] || []

    trackerRef.current.record('ANSWER_SUBMIT', currentQuestion.stage, {
      questionCode: currentQuestion.question_code,
      payload: { finalSelected: currentSelected },
      timeSpentMs,
    })

    const isLast = currentIndex >= questions.length - 1
    if (!isLast) {
      const nextIdx = currentIndex + 1
      const nextQuestion = questions[nextIdx]
      const stageChanged = nextQuestion.stage !== currentQuestion.stage

      await trackerRef.current.flush(answers)
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

    // Final Submit
    setSubmitting(true)
    try {
      trackerRef.current.record('QUIZ_SUBMIT', 'RESULT', {
        payload: { totalQuestions: questions.length },
      })
      const pendingEvents = trackerRef.current.drainAllPending()
      const res = await quizService.submitAttempt(attemptId, attemptToken, pendingEvents, answers)
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
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ==================== SCREEN 1: WELCOME ====================
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen diva-sunburst flex flex-col justify-between p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl my-auto">
          <Card className="overflow-hidden border-4 border-diva-ink bg-diva-parchment shadow-comic">
            {/* Top Ribbon Header */}
            <div className="bg-diva-red px-4 py-3 text-center border-b-4 border-diva-ink">
              <div className="inline-flex items-center gap-2 rounded-full bg-diva-parchment px-3 py-0.5 border-2 border-diva-ink mb-1">
                <span className="font-display text-xs font-extrabold tracking-wider text-diva-ink">
                  MMV VISION 2035 • DiVA TEAM
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-diva-yellow drop-shadow-[0_2px_0_#212121]">
                DiVA Vision Explorer
              </h1>
            </div>

            <CardContent className="p-5 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <DivaMascot pose="presenting" size="lg" className="shrink-0" />
                <div className="space-y-2.5 text-center sm:text-left">
                  <div className="rounded-2xl border-2 border-diva-ink bg-white p-3.5 shadow-comic-sm">
                    <p className="font-semibold text-diva-ink text-sm sm:text-base">
                      “Cùng Tắc kè DiVA khám phá <span className="text-diva-red font-bold">Tầm nhìn MMV 2035</span> qua hành trình giải đố 3 chặng thú vị nhé!”
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
                    <Badge variant="outline" className="bg-white border-diva-ink/40">
                      15 câu hỏi (5 LOOK • 6 THINK • 4 CONNECT)
                    </Badge>
                    <Badge variant="outline" className="bg-white border-diva-ink/40">
                      <Clock className="mr-1 h-3 w-3 text-diva-orange" /> ~8–10 phút
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Employee Identification */}
              {!verifiedUser ? (
                <div className="rounded-2xl border-2 border-diva-ink bg-white p-4 sm:p-5 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-code" className="font-bold text-diva-ink">
                      Nhập Mã nhân viên của bạn để bắt đầu
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="emp-code"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmployee()}
                        placeholder="Ví dụ: MMV0101"
                        className="h-12 border-2 border-diva-ink text-base font-semibold uppercase"
                      />
                      <Button
                        variant="comic"
                        size="lg"
                        disabled={verifying}
                        onClick={() => handleVerifyEmployee()}
                        className="h-12 shrink-0"
                      >
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        {verifying ? 'Đang kiểm tra...' : 'Xác nhận'}
                      </Button>
                    </div>
                  </div>

                  {!quizService.isUsingSupabase() && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <span>Mã dùng thử nhanh:</span>
                      {['MMV0101', 'MMV0102', 'MMV0201'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setEmployeeCode(code)
                            handleVerifyEmployee(code)
                          }}
                          className="rounded-lg border bg-diva-parchment px-2 py-0.5 font-semibold text-diva-ink hover:bg-diva-yellow/60"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-diva-ink bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã xác nhận nhân viên
                      </p>
                      <p className="text-lg font-bold text-diva-ink">
                        {verifiedUser.full_name} ({verifiedUser.employee_code})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Bộ phận: {verifiedUser.department} • Đã hoàn thành: {completedAttempts} lượt
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVerifiedUser(null)
                        setPin('')
                      }}
                    >
                      Đổi mã khác
                    </Button>
                  </div>

                  {completedAttempts === 0 ? (
                    <Alert variant="success">
                      <AlertDescription>
                        Đây là <strong>lượt đầu tiên</strong> — kết quả sẽ được tính chính thức cho giải thưởng{' '}
                        <strong>Vision Champion</strong> & <strong>Vision Engagement</strong>.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="warning">
                      <AlertDescription>
                        Bạn đã hoàn thành lượt tính giải trước đó. Lượt này là <strong>lượt ôn tập kiến thức Vision</strong>.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="comic"
                    size="xl"
                    className="w-full text-lg"
                    disabled={verifying}
                    onClick={handleStartQuiz}
                  >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    {hasInProgress ? 'TIẾP TỤC BÀI ĐANG LÀM' : 'BẮT ĐẦU KHÁM PHÁ'}
                  </Button>
                </div>
              )}

              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Discreet footer with secret gate entry for testing/admin */}
        <footer className="mt-6 text-center text-xs text-white/75 flex items-center justify-center gap-3">
          <span>MMV Vision 2035 — DiVA Explorer</span>
          <span>•</span>
          <Link to="/secret-login" className="opacity-70 hover:opacity-100 underline underline-offset-2">
            Cổng Kiểm tra & Quản trị
          </Link>
        </footer>
      </div>
    )
  }

  // ==================== SCREEN 2: STAGE INTRO ====================
  if (screen === 'stage_intro' && currentQuestion) {
    const meta = STAGE_META[currentQuestion.stage]
    return (
      <div className="min-h-screen diva-sky-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-4 border-diva-ink bg-diva-parchment shadow-comic text-center">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className={`inline-block rounded-full border-2 border-diva-ink px-5 py-1.5 font-display text-lg font-extrabold shadow-comic-sm ${meta.badge}`}>
              {meta.title}
            </div>
            <div className="flex justify-center">
              <DivaMascot pose={meta.pose} size="lg" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-diva-ink">{meta.subtitle}</p>
            <Button variant="comic" size="xl" className="w-full" onClick={enterPlayingCurrentQuestion}>
              <Compass className="mr-2 h-5 w-5" /> Bắt đầu {meta.title}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== SCREEN 4: RESULT ====================
  if (screen === 'result' && submitResult && verifiedUser) {
    return (
      <div className="min-h-screen diva-sky-bg p-4 sm:p-6">
        <ResultReview
          result={submitResult}
          employeeName={`${verifiedUser.full_name} (${verifiedUser.employee_code})`}
          department={verifiedUser.department}
          onViewExplanation={handleViewExplanation}
          onPlayAgain={() => {
            setSubmitResult(null)
            setScreen('welcome')
            handleVerifyEmployee(verifiedUser.employee_code)
          }}
        />
      </div>
    )
  }

  // ==================== SCREEN 3: PLAYING ====================
  if (!currentQuestion) return null
  const meta = STAGE_META[currentQuestion.stage]
  const currentSelected = answers[currentQuestion.question_code] || []
  const canProceed =
    currentQuestion.question_type === 'MULTI_FILL_BLANK'
      ? currentSelected.length >= (currentQuestion.prompt_text.match(/\{\{blank_\d+\}\}/g)?.length || 1)
      : currentSelected.length > 0

  return (
    <div className="min-h-screen diva-sky-bg flex flex-col justify-between p-3 sm:p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* Top Stage Ribbon + Progress Dots */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-diva-ink bg-diva-parchment px-3.5 py-2.5 shadow-comic-sm">
          <div className="flex items-center gap-2">
            <span className={`rounded-xl border-2 border-diva-ink px-3 py-1 font-display text-sm sm:text-base font-extrabold ${meta.badge}`}>
              {meta.title}
            </span>
            <span className="text-xs sm:text-sm font-bold text-diva-ink">
              Câu {currentIndex + 1} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Stage Progress Dots */}
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: stageQuestionsInfo.stageTotal }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border border-diva-ink ${
                    i + 1 < stageQuestionsInfo.posInStage
                      ? 'bg-diva-green'
                      : i + 1 === stageQuestionsInfo.posInStage
                        ? 'bg-diva-yellow scale-125'
                        : 'bg-white'
                  }`}
                />
              ))}
            </div>
            <Badge variant="outline" className="bg-white border-diva-ink/40 font-mono">
              <Clock className="mr-1 h-3.5 w-3.5 text-diva-orange" />
              {formatTimer(elapsedSec)}
            </Badge>
          </div>
        </div>

        {/* Main Question Card */}
        <Card className="border-4 border-diva-ink bg-diva-parchment shadow-comic">
          <CardContent className="p-4 sm:p-6">
            <QuestionRenderer
              question={currentQuestion}
              selectedKeys={currentSelected}
              onSelect={handleSelectAnswer}
            />
          </CardContent>
        </Card>

        {authError && (
          <Alert variant="destructive">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs text-diva-ink/70 font-medium flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-diva-orange" />
            <span>Tự động lưu từng hành động</span>
          </div>
          <Button
            variant="comicRed"
            size="lg"
            disabled={!canProceed || submitting}
            onClick={handleNextOrSubmit}
            className="min-w-[170px]"
          >
            {submitting
              ? 'Đang chấm điểm...'
              : currentIndex >= questions.length - 1
                ? 'Hoàn thành & Xem điểm'
                : 'Câu tiếp theo'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
