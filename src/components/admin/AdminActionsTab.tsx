import React, { useMemo, useState } from 'react'
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

export const AdminActionsTab: React.FC<AdminActionsTabProps> = ({
  attempts,
  actionLogs,
  userRole,
  actorEmail,
  onRefresh,
}) => {
  const [query, setQuery] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null)

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

  const selectedTimeline = useMemo(() => {
    if (!selectedAttempt) return []
    return actionLogs
      .filter((l) => l.attempt_id === selectedAttempt.id)
      .sort((a, b) => a.client_seq - b.client_seq)
  }, [actionLogs, selectedAttempt])

  const handleToggleValidity = async (att: QuizAttempt) => {
    const nextValid = !att.is_valid_for_award
    const reason = nextValid ? '' : 'Admin đánh dấu không hợp lệ khi kiểm tra Action Logs'
    await quizService.toggleAttemptValidity(att.id, nextValid, reason, actorEmail)
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Trình Soi Hành động Chi tiết (Action Inspector)</h2>
          <p className="text-sm text-muted-foreground">
            Kiểm tra toàn bộ thao tác từng giây của từng nhân viên: xem câu, đổi đáp án, rời tab và nộp bài
          </p>
        </div>
        <Input
          placeholder="Tìm theo Mã NV, Tên, Bộ phận..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lịch sử các lượt làm bài ({filteredAttempts.length})</CardTitle>
          <CardDescription>Bấm “Xem Timeline” để kiểm tra chi tiết từng hành động</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Lượt / Trạng thái</TableHead>
                <TableHead>Điểm & Thời gian</TableHead>
                <TableHead>Rời Tab</TableHead>
                <TableHead>Xét giải</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttempts.map((a) => {
                const suspicious = (a.duration_seconds !== undefined && a.duration_seconds < 60) || a.tab_switch_count > 2
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-semibold">{a.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.employee_code} • {a.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Lượt #{a.attempt_number}</Badge>
                      <span className="ml-1.5 text-xs text-muted-foreground">{a.status}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{a.score}/15</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({a.duration_seconds ?? '-'}s)
                      </span>
                    </TableCell>
                    <TableCell>
                      {suspicious ? (
                        <Badge variant="warning">
                          <AlertTriangle className="mr-1 h-3 w-3" /> {a.tab_switch_count} lần
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{a.tab_switch_count} lần</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.is_valid_for_award ? (
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Hợp lệ
                        </Badge>
                      ) : (
                        <Badge variant="secondary" title={a.invalid_reason || ''}>
                          <XCircle className="mr-1 h-3 w-3" /> Không tính giải
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setSelectedAttempt(a)}>
                        <History className="mr-1 h-3.5 w-3.5" /> Xem Timeline
                      </Button>
                      {userRole === 'admin' && a.status === 'Completed' && (
                        <Button
                          size="sm"
                          variant={a.is_valid_for_award ? 'destructive' : 'secondary'}
                          onClick={() => handleToggleValidity(a)}
                        >
                          {a.is_valid_for_award ? 'Hủy hợp lệ' : 'Khôi phục'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Timeline Modal */}
      <Dialog open={Boolean(selectedAttempt)} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-diva-red" />
              Nhật ký từng hành động — {selectedAttempt?.full_name} ({selectedAttempt?.employee_code})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {selectedTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Chưa có chi tiết Action Log cho lượt này.
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
