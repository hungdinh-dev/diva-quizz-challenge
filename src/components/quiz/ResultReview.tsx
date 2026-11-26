import React, { useState } from 'react'
import { Award, CheckCircle2, Clock, Filter, RotateCcw, Sparkles, XCircle } from 'lucide-react'
import { DivaMascot } from '@/components/diva/DivaMascot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SubmitQuizResponse } from '@/types/quiz'

interface ResultReviewProps {
  result: SubmitQuizResponse
  employeeName: string
  department: string
  onViewExplanation: (questionCode: string, filterMode: string) => void
  onPlayAgain: () => void
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m} phút ${s.toString().padStart(2, '0')} giây`
}

export const ResultReview: React.FC<ResultReviewProps> = ({
  result,
  employeeName,
  department,
  onViewExplanation,
  onPlayAgain,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'wrong'>('all')
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0
  const pose = pct >= 85 ? 'cheering' : pct >= 60 ? 'excited' : 'determined'

  const filteredItems =
    filterMode === 'wrong' ? result.review.filter((r) => !r.is_correct) : result.review

  const handleFilterChange = (mode: 'all' | 'wrong') => {
    setFilterMode(mode)
    onViewExplanation('ALL', mode)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12 animate-question-enter">
      {/* Celebration Card */}
      <Card className="relative overflow-hidden border-4 border-diva-ink shadow-comic bg-diva-parchment">
        {pct >= 60 && (
          <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-around opacity-85">
            {['#FFD54F', '#8BC34A', '#42A5F5', '#FF6F91', '#FF8A00'].map((color, idx) => (
              <span
                key={idx}
                className="h-3 w-3 rounded-sm animate-confetti"
                style={{ backgroundColor: color, animationDelay: `${idx * 0.35}s` }}
              />
            ))}
          </div>
        )}

        <div className="bg-diva-red px-5 py-3 text-center text-white border-b-4 border-diva-ink">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-diva-yellow" />
            HOÀN THÀNH HÀNH TRÌNH VISION 2035!
          </h2>
        </div>

        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <DivaMascot pose={pose} size="lg" />

            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {employeeName} • {department}
                </p>
                <div className="mt-1 flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="font-display text-4xl sm:text-5xl font-extrabold text-diva-red">
                    {result.score}/{result.total}
                  </span>
                  <span className="text-lg font-bold text-diva-ink">({pct}%)</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <Badge variant="outline" className="bg-white border-diva-ink/30 py-1">
                  <Clock className="mr-1 h-3.5 w-3.5 text-diva-orange" />
                  {formatDuration(result.duration_seconds)}
                </Badge>
                {result.is_valid_for_award ? (
                  <Badge variant="success" className="py-1">
                    <Award className="mr-1 h-3.5 w-3.5" />
                    Lượt hợp lệ xét giải Champion & Engagement
                  </Badge>
                ) : (
                  <Badge variant="warning" className="py-1">
                    {result.invalid_reason || 'Lượt ôn tập'}
                  </Badge>
                )}
              </div>

              {/* Stage Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-xl border-2 border-diva-ink/20 bg-white p-2 text-center shadow-sm">
                  <div className="text-[11px] font-bold text-muted-foreground">CHẶNG 1: LOOK</div>
                  <div className="font-display text-lg font-extrabold text-diva-ink">
                    {result.score_by_stage.LOOK}
                  </div>
                </div>
                <div className="rounded-xl border-2 border-diva-ink/20 bg-white p-2 text-center shadow-sm">
                  <div className="text-[11px] font-bold text-muted-foreground">CHẶNG 2: THINK</div>
                  <div className="font-display text-lg font-extrabold text-diva-blue">
                    {result.score_by_stage.THINK}
                  </div>
                </div>
                <div className="rounded-xl border-2 border-diva-ink/20 bg-white p-2 text-center shadow-sm">
                  <div className="text-[11px] font-bold text-muted-foreground">CHẶNG 3: CONNECT</div>
                  <div className="font-display text-lg font-extrabold text-diva-green">
                    {result.score_by_stage.CONNECT}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review & Explanations */}
      <Card className="border-2 border-diva-ink/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-lg">Xem lại Đáp án & Giải thích từ DiVA</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Biến mỗi câu hỏi thành một lần hiểu sâu hơn về MMV Vision 2035
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterMode === 'all' ? 'default' : 'outline'}
              onClick={() => handleFilterChange('all')}
            >
              Tất cả ({result.review.length})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'wrong' ? 'default' : 'outline'}
              onClick={() => handleFilterChange('wrong')}
            >
              <Filter className="mr-1 h-3.5 w-3.5" />
              Câu chưa đúng ({result.review.filter((r) => !r.is_correct).length})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 p-6 text-center text-emerald-800 font-medium">
              Xuất sắc! Bạn đã trả lời đúng toàn bộ 100% câu hỏi!
            </div>
          ) : (
            filteredItems.map((item) => {
              const userText = item.user_answer
                .map((k) => {
                  const found = item.options_json.find((o) => o.key === k)
                  return found ? `${k}. ${found.text}` : k
                })
                .join(', ')
              const correctText = item.correct_answer
                .map((k) => {
                  const found = item.options_json.find((o) => o.key === k)
                  return found ? `${k}. ${found.text}` : k
                })
                .join(', ')

              return (
                <div
                  key={item.question_code}
                  onClick={() => onViewExplanation(item.question_code, filterMode)}
                  className="rounded-xl border bg-card p-4 space-y-2 hover:border-diva-ink/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.question_code}</Badge>
                      <Badge variant="secondary">{item.stage}</Badge>
                      <span className="text-xs text-muted-foreground">{item.concept}</span>
                    </div>
                    {item.is_correct ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Chính xác
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Chưa đúng
                      </Badge>
                    )}
                  </div>

                  <p className="font-semibold text-sm sm:text-base">{item.prompt_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="rounded-lg bg-muted/60 px-3 py-2">
                      <span className="font-semibold text-muted-foreground">Bạn chọn: </span>
                      <span className={item.is_correct ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                        {userText || '(Chưa chọn)'}
                      </span>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <span className="font-semibold text-emerald-800">Đáp án đúng: </span>
                      <span className="text-emerald-900 font-semibold">{correctText}</span>
                    </div>
                  </div>

                  {item.explanation && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs sm:text-sm text-amber-950">
                      <span className="font-bold">Giải thích DiVA: </span>
                      {item.explanation}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="comic" size="lg" className="btn-comic-shine" onClick={onPlayAgain}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Quay về Màn hình Chính / Làm lượt ôn tập
        </Button>
      </div>
    </div>
  )
}
