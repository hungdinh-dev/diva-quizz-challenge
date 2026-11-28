import React, { useMemo, useState } from 'react'
import { Award, Check, CheckCircle2, ChevronDown, Clock, Home, X, XCircle } from 'lucide-react'
import { DivaMascot } from '@/components/diva/DivaMascot'
import type { Stage, SubmitQuizResponse } from '@/types/quiz'
import { useI18n } from '@/lib/i18n'
import { localizeQuestion } from '@/data/questionEnglish'

interface ResultReviewProps {
  result: SubmitQuizResponse
  employeeName: string
  employeeCode: string
  department: string
  controls?: React.ReactNode
  onViewExplanation: (questionCode: string, filterMode: string) => void
  onReturnHome: () => void
}

const STAGES: Stage[] = ['LOOK', 'THINK', 'CONNECT']

export const ResultReview: React.FC<ResultReviewProps> = ({
  result,
  employeeName,
  employeeCode,
  department,
  controls,
  onViewExplanation,
  onReturnHome,
}) => {
  const { locale, t } = useI18n()
  const [filterMode, setFilterMode] = useState<'all' | 'wrong'>('all')
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0
  const pose = pct >= 85 ? 'cheering' : pct >= 60 ? 'excited' : 'determined'
  const headline = pct >= 85
    ? t('Xuất sắc! Bạn là Vision Explorer thực thụ!', 'Outstanding! A true Vision Explorer!')
    : pct >= 60
      ? t('Làm tốt lắm! Bạn đã hiểu rõ Vision 2035.', 'Well done! You know Vision 2035 well.')
      : t('Cảm ơn bạn đã hoàn thành hành trình!', 'Thanks for completing the journey!')

  const stageTotals = useMemo(() => {
    const totals: Record<Stage, number> = { LOOK: 0, THINK: 0, CONNECT: 0 }
    result.review.forEach((item) => { totals[item.stage] += 1 })
    return totals
  }, [result.review])

  const wrongCount = result.review.filter((r) => !r.is_correct).length
  const filteredItems = filterMode === 'wrong' ? result.review.filter((r) => !r.is_correct) : result.review

  const handleFilterChange = (mode: 'all' | 'wrong') => {
    setFilterMode(mode)
    onViewExplanation('ALL', mode)
  }

  const minutes = Math.floor(result.duration_seconds / 60)
  const seconds = result.duration_seconds % 60
  const durationText = locale === 'vi'
    ? minutes + ' phút ' + String(seconds).padStart(2, '0') + ' giây'
    : minutes + ' min ' + String(seconds).padStart(2, '0') + ' sec'

  const optionLabel = (options: { key: string; text: string }[], key: string) => options.find((o) => o.key === key)?.text ?? key

  return (
    <main className="dv-result">
      <section className="dv-result-hero">
        <div className="mx-auto flex w-[min(100%-2rem,56rem)] justify-end pt-4">{controls}</div>
        <div className="mx-auto flex w-[min(100%-2rem,56rem)] flex-col items-center gap-6 pb-16 pt-4 text-center sm:flex-row sm:text-left">
          <div className="relative flex shrink-0 items-end gap-2 dv-enter">
            <DivaMascot pose={pose} size="lg" className="!h-32 !w-32 sm:!h-44 sm:!w-44 lg:!h-56 lg:!w-56" />
            <div className="dv-score-ring" style={{ '--p': pct } as React.CSSProperties}
              role="img" aria-label={t('Điểm', 'Score') + ' ' + result.score + '/' + result.total}>
              <div>
                <div className="font-display text-[2.6rem] font-extrabold sm:text-5xl">{result.score}<span className="text-2xl text-[color:var(--dv-ink-soft)]">/{result.total}</span></div>
                <div className="mt-1 text-sm font-extrabold text-[color:var(--dv-ink-soft)]">{pct}%</div>
              </div>
            </div>
          </div>
          <div className="min-w-0 dv-enter-2">
            <p className="dv-eyebrow text-diva-yellow">{t('Hoàn thành hành trình', 'Journey complete')}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-[2.6rem]" style={{ textWrap: 'balance' } as React.CSSProperties}>{headline}</h1>
            <p className="mt-2 text-sm font-semibold text-white/85">
              {employeeName} · {employeeCode}{department ? ' · ' + department : ''}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="dv-fact !border-white/40"><Clock aria-hidden className="!text-diva-yellow" />{durationText}</span>
              {result.is_valid_for_award ? (
                <span className="dv-fact !border-white/40"><Award aria-hidden className="!text-diva-yellow" />{t('Hợp lệ xét giải Champion & Engagement', 'Eligible for Champion & Engagement awards')}</span>
              ) : (
                <span className="dv-fact !border-white/40">{locale === 'vi' && result.invalid_reason ? result.invalid_reason : t('Không tính giải thưởng', 'Not eligible for awards')}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-[min(100%-2rem,56rem)] pb-16">
        {/* Stage breakdown */}
        <div className="-mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 dv-enter-3">
          {STAGES.map((stage, idx) => {
            const score = result.score_by_stage[stage] ?? 0
            const total = stageTotals[stage]
            return (
              <div key={stage} className={'dv-stage-score dv-stage-' + stage.toLowerCase()}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-extrabold tracking-wider text-[color:var(--dv-ink-soft)]">{t('CHẶNG', 'STAGE')} {idx + 1} · {stage}</span>
                  <span className="font-display text-2xl font-extrabold" style={{ color: 'var(--stage)' }}>{score}<span className="text-base text-[color:var(--dv-ink-soft)]">/{total}</span></span>
                </div>
                <div className="dv-stage-score-bar"><span style={{ width: (total ? (score / total) * 100 : 0) + '%' }} /></div>
              </div>
            )
          })}
        </div>

        {/* Review */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold">{t('Xem lại đáp án', 'Review your answers')}</h2>
            <p className="text-sm font-semibold text-[color:var(--dv-ink-soft)]">{t('Chạm vào từng câu để xem chi tiết.', 'Tap a question to see the details.')}</p>
          </div>
          <div className="dv-tabs self-start sm:self-auto">
            <button type="button" aria-pressed={filterMode === 'all'} onClick={() => handleFilterChange('all')}>
              {t('Tất cả', 'All')} ({result.review.length})
            </button>
            <button type="button" aria-pressed={filterMode === 'wrong'} onClick={() => handleFilterChange('wrong')}>
              {t('Chưa đúng', 'Incorrect')} ({wrongCount})
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="dv-review-item flex items-center gap-3 p-5">
              <DivaMascot pose="cheering" size="sm" />
              <p className="font-bold">{t('Tuyệt vời! Bạn không trả lời sai câu nào.', 'Amazing! You didn’t miss a single question.')}</p>
            </div>
          ) : (
            filteredItems.map((rawItem) => {
              const item = localizeQuestion(rawItem, locale)
              const number = result.review.findIndex((r) => r.question_code === item.question_code) + 1
              return (
                <details key={item.question_code} className="dv-review-item"
                  onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open) onViewExplanation(item.question_code, filterMode) }}>
                  <summary className="flex items-center gap-3 p-4">
                    <span className="dv-review-status" style={{ background: item.is_correct ? 'var(--dv-ok-bg)' : 'var(--dv-bad-bg)', color: item.is_correct ? 'var(--dv-ok)' : 'var(--dv-bad)' }}
                      aria-label={item.is_correct ? t('Đúng', 'Correct') : t('Sai', 'Incorrect')}>
                      {item.is_correct ? <CheckCircle2 /> : <XCircle />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold tracking-wider text-[color:var(--dv-ink-soft)]">
                        {t('CÂU', 'Q')} {String(number).padStart(2, '0')} · {item.stage}
                      </span>
                      <span className="mt-0.5 block font-bold leading-snug">{item.prompt_text}</span>
                    </span>
                    <ChevronDown className="dv-review-chevron h-5 w-5 shrink-0" aria-hidden />
                  </summary>
                  <div className="space-y-2 border-t-2 border-dashed border-[color:var(--dv-line)] p-4 text-sm">
                    <p className="flex items-start gap-2">
                      {item.is_correct ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--dv-ok)]" strokeWidth={3} /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--dv-bad)]" strokeWidth={3} />}
                      <span><span className="font-bold text-[color:var(--dv-ink-soft)]">{t('Bạn chọn', 'Your answer')}: </span>
                        <span className="font-semibold">{item.user_answer.length ? item.user_answer.map((k) => optionLabel(item.options_json, k)).join(' · ') : t('(Chưa chọn)', '(No answer)')}</span></span>
                    </p>
                    {!item.is_correct && (
                      <p className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--dv-ok)]" strokeWidth={3} />
                        <span><span className="font-bold text-[color:var(--dv-ink-soft)]">{t('Đáp án đúng', 'Correct answer')}: </span>
                          <span className="font-semibold text-[color:var(--dv-ok)]">{item.correct_answer.map((k) => optionLabel(item.options_json, k)).join(' · ')}</span></span>
                      </p>
                    )}
                    {locale === 'vi' && item.explanation && (
                      <p className="rounded-xl border-2 border-[#e9c96b] bg-[#fff7d6] px-3 py-2 leading-relaxed">
                        <span className="font-extrabold">💡 Giải thích: </span>{item.explanation}
                      </p>
                    )}
                  </div>
                </details>
              )
            })
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <button type="button" className="dv-btn dv-btn-lg" onClick={onReturnHome}>
            <Home className="h-5 w-5" aria-hidden />{t('Về trang chủ', 'Back to home')}
          </button>
        </div>
      </div>
    </main>
  )
}
