import React, { useState } from 'react'
import { CheckCircle2, Eye, Sparkles, ZoomIn } from 'lucide-react'
import { DivaMascot } from '@/components/diva/DivaMascot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SafeQuestion } from '@/types/quiz'

interface QuestionRendererProps {
  question: SafeQuestion
  selectedKeys: string[]
  onSelect: (keys: string[]) => void
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  selectedKeys,
  onSelect,
}) => {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const [diffTab, setDiffTab] = useState<'A' | 'B'>('A')

  const isAnswered = selectedKeys.length > 0
  const dynamicPose = isAnswered
    ? question.stage === 'CONNECT'
      ? 'wink'
      : 'happy'
    : question.mascot_pose || (question.stage === 'THINK' ? 'thinking' : 'pointing')

  const handleSingleClick = (key: string) => {
    onSelect([key])
  }

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

  const renderFillBlankPrompt = () => {
    const parts = question.prompt_text.split(/(\{\{blank_\d+\}\})/g)
    let blankIdx = -1
    return (
      <div className="rounded-2xl border-2 border-diva-ink bg-diva-parchmentDark/80 p-4 sm:p-5 text-base sm:text-lg font-medium leading-relaxed shadow-comic-sm">
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
                  'mx-1 inline-flex min-w-[92px] items-center justify-center rounded-xl border-2 px-3 py-0.5 text-sm sm:text-base font-bold transition-all',
                  opt
                    ? 'border-diva-ink bg-diva-yellow text-diva-ink shadow-comic-sm'
                    : 'border-dashed border-diva-ink/50 bg-white/80 text-muted-foreground'
                )}
                title={opt ? 'Nhấn để bỏ chọn' : 'Chưa điền'}
              >
                {opt ? `${opt.key}. ${opt.text}` : `(${currentIdx + 1})`}
              </button>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mascot + Speech Bubble Prompt */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
        <div className="shrink-0 flex flex-col items-center">
          <DivaMascot pose={dynamicPose} size="md" />
          <Badge variant="outline" className="mt-1 bg-white/90 border-diva-ink/30 text-[11px]">
            {question.concept}
          </Badge>
        </div>

        <div className="relative flex-1 w-full rounded-2xl border-2 border-diva-ink bg-white p-4 sm:p-5 shadow-comic-sm">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-diva-red">
              Mã câu: {question.question_code}
            </span>
            {question.question_type === 'MULTI_FILL_BLANK' && (
              <span className="text-xs font-medium text-muted-foreground">
                Chọn {blankCount} từ bên dưới để điền
              </span>
            )}
          </div>

          {question.question_type === 'MULTI_FILL_BLANK' ? (
            renderFillBlankPrompt()
          ) : (
            <p className="text-base sm:text-lg font-semibold leading-snug text-diva-ink">
              {question.prompt_text}
            </p>
          )}
        </div>
      </div>

      {/* Media Preview for SPOT_DIFFERENCE or Attached Poster Images */}
      {question.media_urls_json && question.media_urls_json.length > 0 && (
        <div className="rounded-2xl border-2 border-diva-ink/30 bg-white/90 p-3">
          {question.question_type === 'SPOT_DIFFERENCE' && question.media_urls_json.length >= 2 ? (
            <div>
              <div className="mb-2 flex items-center justify-between sm:hidden">
                <div className="inline-flex rounded-xl border bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setDiffTab('A')}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold',
                      diffTab === 'A' ? 'bg-white shadow-sm text-diva-red' : 'text-muted-foreground'
                    )}
                  >
                    Hình A
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiffTab('B')}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold',
                      diffTab === 'B' ? 'bg-white shadow-sm text-diva-red' : 'text-muted-foreground'
                    )}
                  >
                    Hình B
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">Chạm tab để đối chiếu</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.media_urls_json.slice(0, 2).map((url, idx) => {
                  const label = idx === 0 ? 'Hình A' : 'Hình B'
                  const hiddenOnMobile =
                    (idx === 0 && diffTab !== 'A') || (idx === 1 && diffTab !== 'B')
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'relative overflow-hidden rounded-xl border bg-diva-parchment',
                        hiddenOnMobile ? 'hidden sm:block' : 'block'
                      )}
                    >
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-diva-ink px-2.5 py-0.5 text-xs font-bold text-white">
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomUrl(url)}
                        className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                        title="Phóng to"
                      >
                        <ZoomIn className="h-4 w-4 text-diva-ink" />
                      </button>
                      <img src={url} alt={label} className="w-full h-48 object-contain" />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="relative flex justify-center">
              <img
                src={question.media_urls_json[0]}
                alt={question.question_code}
                className="max-h-56 rounded-xl object-contain"
              />
              <button
                type="button"
                onClick={() => setZoomUrl(question.media_urls_json![0])}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                title="Phóng to ảnh"
              >
                <ZoomIn className="h-4 w-4 text-diva-ink" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Options Area */}
      {question.question_type === 'MULTI_FILL_BLANK' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {question.options_json.map((opt) => {
            const active = selectedKeys.includes(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleChipClick(opt.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl border-2 border-diva-ink px-3 py-3 text-left transition-all active:translate-y-[1px]',
                  active
                    ? 'bg-diva-yellow shadow-comic-sm'
                    : 'bg-white hover:bg-diva-parchmentDark/60 shadow-comic'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-diva-ink text-xs font-extrabold',
                    active ? 'bg-diva-red text-white' : 'bg-diva-orange text-white'
                  )}
                >
                  {opt.key}
                </span>
                <span className="text-sm sm:text-base font-bold text-diva-ink">{opt.text}</span>
              </button>
            )
          })}
        </div>
      ) : question.question_type === 'IMAGE_CHOICE' &&
        question.options_json.some((o) => Boolean(o.imageUrl)) ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {question.options_json.map((opt) => {
            const active = selectedKeys.includes(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSingleClick(opt.key)}
                className={cn(
                  'group relative flex flex-col items-center rounded-2xl border-2 border-diva-ink p-3 transition-all',
                  active
                    ? 'bg-diva-yellow shadow-comic ring-2 ring-diva-orange'
                    : 'bg-white hover:bg-diva-parchmentDark/50 shadow-comic'
                )}
              >
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="mb-2 h-32 w-full rounded-xl object-contain bg-diva-parchment"
                  />
                ) : (
                  <div className="mb-2 flex h-28 w-full items-center justify-center rounded-xl bg-diva-parchment text-xs text-muted-foreground">
                    <Eye className="mr-1 h-4 w-4" /> Ảnh gốc Vision
                  </div>
                )}
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-diva-ink text-sm font-extrabold',
                      active ? 'bg-diva-red text-white' : 'bg-diva-orange text-white'
                    )}
                  >
                    {opt.key}
                  </span>
                  <span className="text-left text-sm font-semibold text-diva-ink">{opt.text}</span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {question.options_json.map((opt) => {
            const active = selectedKeys.includes(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSingleClick(opt.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-2 border-diva-ink px-4 py-3.5 text-left transition-all min-h-[54px]',
                  active
                    ? 'bg-diva-yellow shadow-comic translate-y-[-1px]'
                    : 'bg-white hover:bg-diva-parchmentDark/60 shadow-comic-sm'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-diva-ink text-sm font-extrabold',
                    active ? 'bg-diva-red text-white' : 'bg-diva-orange text-white'
                  )}
                >
                  {opt.key}
                </span>
                <span className="flex-1 text-sm sm:text-base font-semibold text-diva-ink">
                  {opt.text}
                </span>
                {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-diva-red" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Image Zoom Dialog */}
      <Dialog open={Boolean(zoomUrl)} onOpenChange={() => setZoomUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-diva-orange" /> Chi tiết hình ảnh ({question.question_code})
            </DialogTitle>
          </DialogHeader>
          {zoomUrl && (
            <img src={zoomUrl} alt="Phóng to" className="max-h-[70vh] w-full object-contain rounded-xl" />
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setZoomUrl(null)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
