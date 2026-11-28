import React, { useEffect, useState } from 'react'
import { Check, CheckCircle2, MousePointerClick, X, ZoomIn } from 'lucide-react'
import { DivaMascot, type DivaPose } from '@/components/diva/DivaMascot'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ActionBuilder } from '@/components/quiz/ActionBuilder'
import { useI18n } from '@/lib/i18n'
import type { SafeQuestion, Stage } from '@/types/quiz'

interface QuestionRendererProps {
  question: SafeQuestion
  questionIndex?: number
  questionNumber?: number
  selectedKeys: string[]
  changeCount?: number
  /** Set once the answer has been graded: highlights correct / wrong options. */
  correctKeys?: string[]
  disabled?: boolean
  onSelect: (keys: string[]) => void
}

const IDLE_POSES_BY_STAGE: Record<Stage, DivaPose[]> = {
  LOOK: ['explore', 'pointing', 'curious', 'surprised', 'presenting'],
  THINK: ['thinking', 'curious', 'confused', 'determined', 'thinking'],
  CONNECT: ['pointing', 'running', 'determined', 'curious'],
}

const ANSWERED_POSES: DivaPose[] = ['happy', 'excited', 'wink', 'laughing', 'cheering', 'presenting']

const STAGE_MOOD_TIP: Record<Stage, [string, string]> = {
  LOOK: ['Quan sát kỹ từng chi tiết nhé!', 'Look closely at the details!'],
  THINK: ['Suy luận cùng DiVA nào!', 'Think it through with DiVA!'],
  CONNECT: ['Liên hệ ngay công việc hằng ngày!', 'Think about your day-to-day work!'],
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  questionIndex = 0,
  questionNumber,
  selectedKeys,
  changeCount = 0,
  correctKeys,
  disabled = false,
  onSelect,
}) => {
  const { t } = useI18n()
  const artworkButtons = question.question_code === 'V2035-04' || question.question_code === 'V2035-05'
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const [diffTab, setDiffTab] = useState<'A' | 'B'>('A')
  const [isIdleLong, setIsIdleLong] = useState(false)
  const [justChanged, setJustChanged] = useState(false)
  const graded = Boolean(correctKeys)

  // Reset idle timer when switching to a new question
  useEffect(() => {
    setIsIdleLong(false)
    setJustChanged(false)
    const timer = window.setTimeout(() => setIsIdleLong(true), 25000)
    return () => window.clearTimeout(timer)
  }, [question.question_code])

  // Briefly react when the user changes their chosen answer
  useEffect(() => {
    if (changeCount <= 0) return
    setJustChanged(true)
    const timer = window.setTimeout(() => setJustChanged(false), 1400)
    return () => window.clearTimeout(timer)
  }, [changeCount])

  const isAnswered = selectedKeys.length > 0
  const stageIdlePool = IDLE_POSES_BY_STAGE[question.stage] || ['pointing']
  const baseIdlePose = stageIdlePool[questionIndex % stageIdlePool.length]
  const answeredPose = ANSWERED_POSES[questionIndex % ANSWERED_POSES.length]

  const dynamicPose: DivaPose = justChanged
    ? 'surprised'
    : isAnswered
      ? answeredPose
      : isIdleLong
        ? questionIndex % 2 === 0 ? 'sleepy' : 'confused'
        : baseIdlePose

  const divaReactionCaption = graded
    ? t('Cùng xem kết quả nào!', 'Let’s see how you did!')
    : justChanged
      ? t('Ồ, bạn đổi ý rồi à?', 'Oh, changed your mind?')
      : isAnswered
        ? t('Chắc chắn chưa? Bấm Xác nhận nhé!', 'Sure? Hit “Check answer”!')
        : isIdleLong
          ? t('Đọc kỹ từ khóa trong câu hỏi nhé!', 'Look for the keywords in the question!')
          : t(...STAGE_MOOD_TIP[question.stage])

  // Visual state of an option: before grading = selected / not; after = correct / wrong / muted.
  const optionState = (key: string) => {
    if (correctKeys) {
      if (correctKeys.includes(key)) return 'is-correct'
      if (selectedKeys.includes(key)) return 'is-wrong'
      return 'is-muted'
    }
    return selectedKeys.includes(key) ? 'is-selected' : ''
  }
  const optionMark = (key: string) => {
    const state = optionState(key)
    if (state === 'is-correct') return <Check className="dv-option-mark" strokeWidth={3} aria-hidden />
    if (state === 'is-wrong') return <X className="dv-option-mark" strokeWidth={3} aria-hidden />
    if (state === 'is-selected') return <CheckCircle2 className="dv-option-mark" aria-hidden />
    return null
  }

  const handleSingleClick = (key: string) => onSelect([key])

  // MULTI_FILL_BLANK: fill blanks sequentially or tap a filled blank to remove it
  const blankMatches = question.prompt_text.match(/\{\{blank_\d+\}\}/g) || []
  const blankCount = blankMatches.length || 3

  const handleChipClick = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelect(selectedKeys.filter((k) => k !== key))
    } else if (selectedKeys.length < blankCount) {
      onSelect([...selectedKeys, key])
    } else {
      onSelect([...selectedKeys.slice(0, blankCount - 1), key])
    }
  }

  const handleBlankClear = (idx: number) => {
    const next = [...selectedKeys]
    next.splice(idx, 1)
    onSelect(next)
  }

  const isImageQuestion = artworkButtons || (question.question_type === 'IMAGE_CHOICE' && question.options_json.some((o) => Boolean(o.imageUrl)))
  const instruction =
    question.question_type === 'ACTION_BUILDER'
      ? null // ActionBuilder shows its own instruction
      : question.question_type === 'MULTI_FILL_BLANK'
        ? t('Chọn ' + blankCount + ' từ bên dưới để điền vào chỗ trống', 'Pick ' + blankCount + ' words below to fill the blanks')
        : isImageQuestion
          ? t('Chạm vào hình bạn chọn', 'Tap the image you choose')
          : t('Chọn 1 đáp án', 'Choose one answer')

  const renderFillBlankPrompt = () => {
    const parts = question.prompt_text.split(/(\{\{blank_\d+\}\})/g)
    let blankIdx = -1
    return (
      <p className="dv-prompt">
        {parts.map((part, i) => {
          if (/^\{\{blank_\d+\}\}$/.test(part)) {
            blankIdx += 1
            const currentIdx = blankIdx
            const key = selectedKeys[currentIdx]
            const opt = question.options_json.find((o) => o.key === key)
            return (
              <button
                key={i}
                type="button"
                onClick={() => key && handleBlankClear(currentIdx)}
                className={cn(
                  'mx-1 inline-flex min-w-[92px] items-center justify-center rounded-xl border-2 px-3 py-0.5 align-middle text-base font-bold transition-all',
                  opt ? 'border-diva-ink bg-diva-yellow text-diva-ink' : 'border-dashed border-diva-ink/40 bg-white text-muted-foreground'
                )}
                disabled={disabled}
                title={opt ? t('Nhấn để bỏ chọn', 'Click to clear') : t('Chưa điền', 'Blank')}
              >
                {opt ? opt.text : `(${currentIdx + 1})`}
              </button>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </p>
    )
  }

  const imageColumns = artworkButtons ? (question.options_json.length === 2 ? 1 : 3) : question.options_json.length === 2 ? 2 : 3

  return (
    <article className="dv-qcard animate-question-enter" aria-labelledby={'q-' + question.question_code}>
      <div className="dv-qhead">
        <DivaMascot pose={dynamicPose} size="sm" className="dv-qhead-mascot" />
        <p className="dv-bubble" aria-live="polite">{divaReactionCaption}</p>
      </div>

      <div className="dv-qbody">
        <div className="dv-qmeta">
          <span className="dv-qnum">{t('CÂU', 'QUESTION')} {String(questionNumber ?? questionIndex + 1).padStart(2, '0')}</span>
          {question.concept && <span className="dv-concept">{question.concept}</span>}
        </div>

        <div id={'q-' + question.question_code}>
          {question.question_type === 'MULTI_FILL_BLANK' ? renderFillBlankPrompt() : <h1 className="dv-prompt">{question.prompt_text}</h1>}
        </div>
        {instruction && !graded && (
          <p className="dv-instruction"><MousePointerClick aria-hidden />{instruction}</p>
        )}

        {/* Media preview for SPOT_DIFFERENCE or attached images */}
        {question.media_urls_json && question.media_urls_json.length > 0 && (
          <div className="mt-4 rounded-2xl border-2 border-diva-ink bg-white p-3">
            {question.question_type === 'SPOT_DIFFERENCE' && question.media_urls_json.length >= 2 ? (
              <div>
                <div className="dv-tabs mb-3 sm:hidden">
                  {(['A', 'B'] as const).map((tab) => (
                    <button key={tab} type="button" aria-pressed={diffTab === tab} onClick={() => setDiffTab(tab)}>
                      {t('Hình', 'Image')} {tab}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {question.media_urls_json.slice(0, 2).map((url, idx) => {
                    const label = idx === 0 ? 'A' : 'B'
                    const hiddenOnMobile = diffTab !== label
                    return (
                      <div key={idx} className={cn('relative overflow-hidden rounded-xl bg-[color:var(--dv-cream)]', hiddenOnMobile ? 'hidden sm:block' : 'block')}>
                        <span className="absolute left-2 top-2 z-10 rounded-full bg-diva-ink px-2.5 py-0.5 text-xs font-bold text-white">
                          {t('Hình', 'Image')} {label}
                        </span>
                        <button type="button" onClick={() => setZoomUrl(url)} className="dv-icon-btn absolute right-2 top-2 z-10 !h-9 !w-9"
                          aria-label={t('Phóng to', 'Zoom in')}>
                          <ZoomIn className="h-4 w-4" />
                        </button>
                        <img src={url} alt={t('Hình', 'Image') + ' ' + label} className="h-56 w-full object-contain" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="relative flex justify-center">
                <img src={question.media_urls_json[0]} alt="" className="max-h-64 rounded-xl object-contain" />
                <button type="button" onClick={() => setZoomUrl(question.media_urls_json![0])} className="dv-icon-btn absolute right-1 top-1 !h-9 !w-9"
                  aria-label={t('Phóng to ảnh', 'Zoom in')}>
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">{t('Các lựa chọn', 'Options')}</legend>
          {question.question_type === 'ACTION_BUILDER' ? (
            <ActionBuilder
              key={question.question_code}
              options={question.options_json}
              selectedKeys={selectedKeys}
              limit={question.options_json[0]?.selectionLimit ?? 1}
              correctKeys={correctKeys}
              onSelect={onSelect}
            />
          ) : question.question_type === 'MULTI_FILL_BLANK' ? (
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {question.options_json.map((opt) => (
                <button key={opt.key} type="button" aria-pressed={selectedKeys.includes(opt.key)}
                  onClick={() => handleChipClick(opt.key)} className={cn('dv-option !min-h-[3.25rem]', optionState(opt.key))}>
                  <span className="dv-option-key">{opt.key}</span>
                  <span className="dv-option-text">{opt.text}</span>
                </button>
              ))}
            </div>
          ) : isImageQuestion ? (
            <div className={cn('dv-image-grid', artworkButtons && 'is-artwork', artworkButtons && imageColumns === 1 && 'is-artwork-row')} style={{ '--cols': imageColumns } as React.CSSProperties}>
              {question.options_json.map((opt) => {
                const state = optionState(opt.key)
                return (
                  <button key={opt.key} type="button" aria-pressed={selectedKeys.includes(opt.key)}
                    aria-label={opt.key + ' · ' + opt.text}
                    className={cn('dv-image-option', state)} onClick={() => handleSingleClick(opt.key)}>
                    <span className="dv-image-frame">
                      {opt.imageUrl
                        ? <img src={opt.imageUrl} alt="" draggable={false} />
                        : <span className="dv-image-frame-text">{opt.text}</span>}
                    </span>
                    <span className="dv-image-caption">
                      <span className="dv-option-key">{opt.key}</span>
                      {!artworkButtons && <span className="min-w-0">{opt.text}</span>}
                    </span>
                    {state && state !== 'is-muted' && (
                      <span className="dv-image-check" aria-hidden>
                        {state === 'is-wrong' ? <X strokeWidth={3} /> : <Check strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="dv-options">
              {question.options_json.map((opt) => (
                <button key={opt.key} type="button" aria-pressed={selectedKeys.includes(opt.key)}
                  onClick={() => handleSingleClick(opt.key)} className={cn('dv-option', optionState(opt.key))}>
                  <span className="dv-option-key">{opt.key}</span>
                  <span className="dv-option-text">{opt.text}</span>
                  {optionMark(opt.key)}
                </button>
              ))}
            </div>
          )}
        </fieldset>
      </div>

      {/* Image zoom dialog */}
      <Dialog open={Boolean(zoomUrl)} onOpenChange={() => setZoomUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('Chi tiết hình ảnh', 'Image detail')}</DialogTitle>
          </DialogHeader>
          {zoomUrl && <img src={zoomUrl} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setZoomUrl(null)}>{t('Đóng', 'Close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
}
