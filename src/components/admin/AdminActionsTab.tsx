import { useI18n } from '@/lib/i18n'
import React, { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, AlertTriangle, CheckCircle2, History, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { quizService } from '@/services/quizService'
import type { QuizActionEvent, QuizAttempt, UserRole } from '@/types/quiz'

interface AdminActionsTabProps {
  attempts: QuizAttempt[]
  actionLogs: QuizActionEvent[]
  userRole: UserRole
  actorEmail: string
  onRefresh: () => Promise<void>
}

const pageSize = 40

export const AdminActionsTab: React.FC<AdminActionsTabProps> = ({
  attempts,
  actionLogs,
  userRole,
  actorEmail,
  onRefresh,
}) => {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [liveAttempts, setLiveAttempts] = useState<QuizAttempt[]>([])
  const [liveTimeline, setLiveTimeline] = useState<QuizActionEvent[]>([])
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null)
  const [loadingAttempts, setLoadingAttempts] = useState(false)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [error, setError] = useState('')
  const [timelineError, setTimelineError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const live = quizService.isUsingSupabase()

  useEffect(() => {
    if (!live) return
    let current = true
    setLoadingAttempts(true)
    setError('')
    quizService.getAttemptPage(page, search, pageSize)
      .then((result) => { if (current) { setLiveAttempts(result.attempts); setTotal(result.total) } })
      .catch((err: Error) => { if (current) { setError(err.message); setLiveAttempts([]); setTotal(0) } })
      .finally(() => { if (current) setLoadingAttempts(false) })
    return () => { current = false }
  }, [live, page, search, refresh])

  useEffect(() => {
    if (!live || !selectedAttempt) return
    let current = true
    setLiveTimeline([])
    setTimelineError('')
    setLoadingTimeline(true)
    quizService.getAttemptTimeline(selectedAttempt.id)
      .then((events) => { if (current) setLiveTimeline(events) })
      .catch((err: Error) => { if (current) setTimelineError(err.message) })
      .finally(() => { if (current) setLoadingTimeline(false) })
    return () => { current = false }
  }, [live, selectedAttempt])

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      if (!query) return true
      const q = query.toLowerCase()
      return (
        a.employee_code.toLowerCase().includes(q) ||
        a.full_name.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q)
      )
    })
  }, [attempts, query])

  const demoTimeline = useMemo(() => {
    if (!selectedAttempt) return []
    return actionLogs
      .filter((l) => l.attempt_id === selectedAttempt.id)
      .sort((a, b) => a.client_seq - b.client_seq)
  }, [actionLogs, selectedAttempt])
  const selectedTimeline = live ? liveTimeline : demoTimeline
  const shownAttempts = live ? liveAttempts : filteredAttempts
  const count = live ? total : filteredAttempts.length

  const handleToggleValidity = async (att: QuizAttempt) => {
    const nextValid = !att.is_valid_for_award
    const reason = nextValid ? '' : 'Admin đánh dấu không hợp lệ khi kiểm tra Action Logs'
    try {
      await quizService.toggleAttemptValidity(att.id, nextValid, reason, actorEmail)
      setRefresh((value) => value + 1)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật lượt làm bài.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("Trình Soi Hành động Chi tiết (Action Inspector)", "Attempt activity")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Kiểm tra toàn bộ thao tác từng giây của từng nhân viên: xem câu, đổi đáp án, rời tab và nộp bài", "See question views, answer changes, tab switches and submissions.")}
          </p>
        </div>
        <form className="flex gap-2" onSubmit={(event) => {
          event.preventDefault()
          setPage(0)
          setSearch(query.trim())
          setRefresh((value) => value + 1)
        }}>
          <Input aria-label={t("Tìm lượt làm bài", "Search attempts")} placeholder={t("Mã NV, tên hoặc công ty", "Employee ID, name or company")}
            value={query} onChange={(event) => setQuery(event.target.value)} />
          {live && <Button variant="outline" type="submit">{t("Tìm", "Search")}</Button>}
        </form>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Lịch sử các lượt làm bài (", "Attempt history (")}{count})</CardTitle>
          <CardDescription>{t("Bấm “Xem Timeline” để kiểm tra chi tiết từng hành động", "Open the timeline to see each recorded event.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Nhân viên", "Employee")}</TableHead>
                <TableHead>{t("Lượt / Trạng thái", "Attempt / status")}</TableHead>
                <TableHead>{t("Điểm & Thời gian", "Score & time")}</TableHead>
                <TableHead>{t("Rời Tab", "Tab switches")}</TableHead>
                <TableHead>{t("Xét giải", "Award eligibility")}</TableHead>
                <TableHead className="text-right">{t("Hành động", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingAttempts && <TableRow><TableCell colSpan={6}>{t("Đang tải lượt làm bài…", "Loading attempts…")}</TableCell></TableRow>}
              {!loadingAttempts && !shownAttempts.length && <TableRow><TableCell colSpan={6}>{t("Chưa có lượt làm bài phù hợp.", "No matching attempts.")}</TableCell></TableRow>}
              {!loadingAttempts && shownAttempts.map((a) => {
                const suspicious = (a.duration_seconds != null && a.duration_seconds < 60) || a.tab_switch_count > 2
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-semibold">{a.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.employee_code} • {a.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t("Lượt #", "Attempt #")}{a.attempt_number}</Badge>
                      <span className="ml-1.5 text-xs text-muted-foreground">{a.status}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{a.status === 'Completed' ? `${a.score}/${a.selected_questions_json.length}` : '—'}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({a.duration_seconds ?? '-'}s)
                      </span>
                    </TableCell>
                    <TableCell>
                      {suspicious ? (
                        <Badge variant="warning">
                          <AlertTriangle className="mr-1 h-3 w-3" /> {a.tab_switch_count} {t("lần", "times")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{a.tab_switch_count} {t("lần", "times")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.is_valid_for_award ? (
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> {t("Hợp lệ", "Eligible")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" title={a.invalid_reason || ''}>
                          <XCircle className="mr-1 h-3 w-3" /> {t("Không tính giải", "Ineligible")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setSelectedAttempt(a)}>
                        <History className="mr-1 h-3.5 w-3.5" /> {t('Xem nhật ký', 'Open timeline')}
                      </Button>
                      {userRole === 'admin' && a.status === 'Completed' && (
                        <Button
                          size="sm"
                          variant={a.is_valid_for_award ? 'destructive' : 'secondary'}
                          onClick={() => handleToggleValidity(a)}
                        >
                          {a.is_valid_for_award ? t("Hủy hợp lệ", "Mark ineligible") : t("Khôi phục", "Restore")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {live && <div className="mt-3 flex items-center gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page === 0 || loadingAttempts} onClick={() => setPage(page - 1)}>{t("Trang trước", "Previous page")}</Button>
            <span>{page + 1} / {Math.max(1, Math.ceil(count / pageSize))}</span>
            <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= count || loadingAttempts} onClick={() => setPage(page + 1)}>{t("Trang sau", "Next page")}</Button>
          </div>}
        </CardContent>
      </Card>

      {/* Action Timeline Modal */}
      <Dialog open={Boolean(selectedAttempt)} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-diva-red" />
              {t("Nhật ký từng hành động —", "Activity timeline —")} {selectedAttempt?.full_name} ({selectedAttempt?.employee_code})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {timelineError && <Alert variant="destructive"><AlertDescription>{timelineError}</AlertDescription></Alert>}
            {loadingTimeline ? <p role="status">{t("Đang tải nhật ký…", "Loading activity…")}</p> : !timelineError && selectedTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t("Chưa có chi tiết Action Log cho lượt này.", "No activity recorded for this attempt.")}
              </p>
            ) : (
              selectedTimeline.map((ev) => (
                <div
                  key={`${ev.attempt_id}-${ev.client_seq}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-muted-foreground w-6">#{ev.client_seq}</span>
                    <Badge
                      variant={
                        ev.event_type === 'OPTION_CHANGE'
                          ? 'warning'
                          : ev.event_type === 'TAB_BLUR'
                            ? 'destructive'
                            : ev.event_type === 'QUIZ_SUBMIT'
                              ? 'success'
                              : 'outline'
                      }
                    >
                      {ev.event_type}
                    </Badge>
                    {ev.question_code && <Badge variant="secondary">{ev.question_code}</Badge>}
                    <span className="text-muted-foreground truncate max-w-[260px]">
                      {JSON.stringify(ev.event_payload)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono shrink-0">
                    {ev.time_spent_ms > 0 && <span>{(ev.time_spent_ms / 1000).toFixed(1)}s</span>}
                    <span>{new Date(ev.event_time).toLocaleTimeString('vi-VN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
