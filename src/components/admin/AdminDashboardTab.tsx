import React, { useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Award, Building2, Download, Smartphone, Trophy, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { QuizActionEvent, QuizAttempt, UserProfile } from '@/types/quiz'

interface AdminDashboardTabProps {
  users: UserProfile[]
  attempts: QuizAttempt[]
  actionLogs: QuizActionEvent[]
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  users,
  attempts,
  actionLogs,
}) => {
  const activeUsers = useMemo(() => users.filter((u) => u.is_active), [users])
  const completedAttempts = useMemo(
    () => attempts.filter((a) => a.status === 'Completed'),
    [attempts]
  )
  const validAttempts = useMemo(
    () => completedAttempts.filter((a) => a.is_valid_for_award),
    [completedAttempts]
  )

  const uniqueValidEmployees = useMemo(
    () => new Set(validAttempts.map((a) => a.employee_code)),
    [validAttempts]
  )

  const companyParticipationPct = activeUsers.length
    ? Math.round((uniqueValidEmployees.size / activeUsers.length) * 100)
    : 0

  const avgScore = validAttempts.length
    ? (validAttempts.reduce((acc, a) => acc + a.score, 0) / validAttempts.length).toFixed(1)
    : '0.0'

  const mobileCount = completedAttempts.filter((a) => a.device_type === 'Mobile').length
  const mobilePct = completedAttempts.length
    ? Math.round((mobileCount / completedAttempts.length) * 100)
    : 0

  // Vision Engagement Award by Department
  const departmentStats = useMemo(() => {
    const deptMap = new Map<string, { total: number; validSet: Set<string>; scoreSum: number }>()
    for (const u of activeUsers) {
      if (!deptMap.has(u.department)) {
        deptMap.set(u.department, { total: 0, validSet: new Set(), scoreSum: 0 })
      }
      deptMap.get(u.department)!.total += 1
    }
    for (const a of validAttempts) {
      if (!deptMap.has(a.department)) {
        deptMap.set(a.department, { total: 1, validSet: new Set(), scoreSum: 0 })
      }
      const entry = deptMap.get(a.department)!
      if (!entry.validSet.has(a.employee_code)) {
        entry.validSet.add(a.employee_code)
        entry.scoreSum += a.score
      }
    }
    return Array.from(deptMap.entries())
      .map(([department, v]) => ({
        department,
        totalEmployees: v.total,
        completedEmployees: v.validSet.size,
        pct: v.total > 0 ? Math.round((v.validSet.size / v.total) * 100) : 0,
        avgScore: v.validSet.size > 0 ? Number((v.scoreSum / v.validSet.size).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.pct - a.pct || b.avgScore - a.avgScore)
  }, [activeUsers, validAttempts])

  // Vision Champion Award Ranking (Score DESC, Duration ASC)
  const championRanking = useMemo(() => {
    return [...validAttempts].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.duration_seconds || 9999) - (b.duration_seconds || 9999)
    })
  }, [validAttempts])

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const wsDept = XLSX.utils.json_to_sheet(
      departmentStats.map((d, i) => ({
        Hang: i + 1,
        Bo_Phan: d.department,
        Da_Tham_Gia_Hop_Le: d.completedEmployees,
        Tong_Nhan_Su: d.totalEmployees,
        Ty_Le_Phan_Tram: `${d.pct}%`,
        Diem_Trung_Binh: d.avgScore,
      }))
    )
    const wsChamp = XLSX.utils.json_to_sheet(
      championRanking.map((a, i) => ({
        Hang: i + 1,
        Ma_NV: a.employee_code,
        Ho_Ten: a.full_name,
        Bo_Phan: a.department,
        Diem: a.score,
        Thoi_Gian_Giay: a.duration_seconds || 0,
        Thiet_Bi: a.device_type,
        Thoi_Diem_Nop: a.submitted_at || '',
      }))
    )
    const wsLogs = XLSX.utils.json_to_sheet(
      actionLogs.map((l) => ({
        AttemptId: l.attempt_id,
        Seq: l.client_seq,
        Ma_NV: l.employee_code,
        Ma_Cau: l.question_code || '',
        Chang: l.stage,
        Hanh_Dong: l.event_type,
        Chi_Tiet: JSON.stringify(l.event_payload),
        Thoi_Gian_Ms: l.time_spent_ms,
        Thoi_Diem: l.event_time,
      }))
    )
    XLSX.utils.book_append_sheet(wb, wsDept, 'Engagement_PhongBan')
    XLSX.utils.book_append_sheet(wb, wsChamp, 'Champion_Ranking')
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Action_Logs')
    XLSX.writeFile(wb, `DiVA_Vision_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tổng quan & Xét giải Vision 2035</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi tỷ lệ tham gia theo phòng ban và xếp hạng cá nhân hợp lệ
          </p>
        </div>
        <Button onClick={handleExportExcel} variant="outline" className="shrink-0">
          <Download className="mr-2 h-4 w-4" /> Xuất Báo cáo Excel (.xlsx)
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tham gia Hợp lệ</CardTitle>
            <Users className="h-4 w-4 text-diva-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueValidEmployees.size} / {activeUsers.length}
            </div>
            <Progress value={companyParticipationPct} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1.5">{companyParticipationPct}% toàn công ty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Điểm Trung bình</CardTitle>
            <Award className="h-4 w-4 text-diva-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore} / 15</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tính trên {validAttempts.length} lượt hợp lệ đầu tiên
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Action Logs</CardTitle>
            <Trophy className="h-4 w-4 text-diva-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sự kiện từng bước được ghi nhận
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Thiết bị Mobile</CardTitle>
            <Smartphone className="h-4 w-4 text-diva-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mobilePct}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mobileCount} / {completedAttempts.length} lượt hoàn thành bằng điện thoại
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Award Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-diva-blue" /> Vision Engagement Award (Theo Bộ phận)
            </CardTitle>
            <CardDescription>Xếp hạng theo % nhân sự hoàn thành hợp lệ (công bằng phòng nhỏ & lớn)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.map((d, idx) => (
                <div key={d.department} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      #{idx + 1} {d.department}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {d.completedEmployees}/{d.totalEmployees} NV ({d.pct}%) • TB {d.avgScore}đ
                    </span>
                  </div>
                  <Progress value={d.pct} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-diva-orange" /> Vision Champion Award (Cá nhân)
            </CardTitle>
            <CardDescription>Điểm cao nhất; đồng điểm xét thời gian hoàn thành nhanh hơn</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hạng</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {championRanking.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Chưa có lượt thi hợp lệ.
                    </TableCell>
                  </TableRow>
                ) : (
                  championRanking.slice(0, 10).map((a, idx) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant={idx === 0 ? 'default' : idx < 3 ? 'secondary' : 'outline'}>
                          #{idx + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{a.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.employee_code} • {a.department}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">{a.score}/15</TableCell>
                      <TableCell className="font-mono text-xs">{a.duration_seconds || 0}s</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
