import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import * as XLSX from 'xlsx'
import { QrCode, Save, Shield, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { quizService } from '@/services/quizService'
import type { AdminAuditLog, Campaign, EmployeeType, UserProfile, UserRole } from '@/types/quiz'

interface AdminSettingsTabProps {
  campaigns: Campaign[]
  users: UserProfile[]
  auditLogs: AdminAuditLog[]
  actorEmail: string
  onRefresh: () => Promise<void>
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  campaigns,
  users,
  auditLogs,
  actorEmail,
  onRefresh,
}) => {
  const activeCamp = campaigns[0]
  const [campDraft, setCampDraft] = useState<Campaign | null>(activeCamp ? { ...activeCamp } : null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  const quizUrl = typeof window !== 'undefined' ? window.location.origin : 'https://diva-quiz.vercel.app'

  const handleSaveCampaign = async () => {
    if (!campDraft) return
    await quizService.updateCampaign(campDraft, actorEmail)
    setSavedNotice('Đã lưu cấu hình chiến dịch thành công.')
    await onRefresh()
  }

  const handleRoleChange = async (user: UserProfile, role: UserRole) => {
    await quizService.updateUserRole(user.id, role, user.is_active, actorEmail)
    await onRefresh()
  }

  const handleToggleActive = async (user: UserProfile, isActive: boolean) => {
    await quizService.updateUserRole(user.id, user.role, isActive, actorEmail)
    await onRefresh()
  }

  const handleImportUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]])
    const imported: UserProfile[] = rows
      .filter((r) => r['EmployeeCode'] && r['FullName'])
      .map((r, i) => ({
        id: `u-imp-${Date.now()}-${i}`,
        employee_code: String(r['EmployeeCode']).trim(),
        full_name: String(r['FullName']).trim(),
        email: r['Email'] ? String(r['Email']).trim() : null,
        department: String(r['Department'] || 'Chung').trim(),
        employee_type: (String(r['EmployeeType'] || 'Genba') as EmployeeType),
        role: (String(r['Role'] || 'employee') as UserRole),
        is_active: true,
      }))
    if (imported.length > 0) {
      await quizService.upsertUsers(imported, actorEmail)
      setSavedNotice(`Đã import ${imported.length} nhân sự vào hệ thống.`)
      await onRefresh()
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      {savedNotice && (
        <Alert variant="success">
          <AlertDescription>{savedNotice}</AlertDescription>
        </Alert>
      )}

      {/* Campaign Config + Genba QR Code */}
      {campDraft && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Cấu hình Chiến dịch Quiz</CardTitle>
              <CardDescription>Điều chỉnh chế độ rút đề, ngưỡng thời gian hợp lệ và Webhook</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Tên chiến dịch</Label>
                  <Input
                    value={campDraft.title}
                    onChange={(e) => setCampDraft({ ...campDraft, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Chế độ bộ đề</Label>
                  <Select
                    value={campDraft.quiz_mode}
                    onValueChange={(val: Campaign['quiz_mode']) =>
                      setCampDraft({ ...campDraft, quiz_mode: val })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Random_Pool_15">Ngẫu nhiên 15 câu (5-6-4)</SelectItem>
                      <SelectItem value="Set_A">Bộ A cố định (Vision Explorer)</SelectItem>
                      <SelectItem value="Set_B">Bộ B cố định (Think & Act)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Trạng thái</Label>
                  <Select
                    value={campDraft.status}
                    onValueChange={(val: Campaign['status']) =>
                      setCampDraft({ ...campDraft, status: val })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active (Đang mở)</SelectItem>
                      <SelectItem value="Closed">Closed (Đã đóng)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Giây tối thiểu hợp lệ</Label>
                  <Input
                    type="number"
                    value={campDraft.min_valid_seconds}
                    onChange={(e) =>
                      setCampDraft({ ...campDraft, min_valid_seconds: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Số lượt tối đa (0 = không giới hạn)</Label>
                  <Input
                    type="number"
                    value={campDraft.max_attempts}
                    onChange={(e) =>
                      setCampDraft({ ...campDraft, max_attempts: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Google Sheet Webhook URL (Tùy chọn đồng bộ kết quả)</Label>
                <Input
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={campDraft.google_sheet_webhook || ''}
                  onChange={(e) => setCampDraft({ ...campDraft, google_sheet_webhook: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={campDraft.show_leaderboard}
                    onCheckedChange={(c) => setCampDraft({ ...campDraft, show_leaderboard: c })}
                  />
                  <Label>Hiển thị bảng xếp hạng công khai</Label>
                </div>
                <Button onClick={handleSaveCampaign}>
                  <Save className="mr-2 h-4 w-4" /> Lưu cấu hình
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4 text-diva-red" /> Mã QR cho xưởng Genba
              </CardTitle>
              <CardDescription>In mã QR này dán tại bảng tin xưởng để công nhân quét làm bài</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-3">
              <div className="rounded-2xl border-2 border-diva-ink bg-white p-4">
                <QRCodeSVG value={quizUrl} size={156} />
              </div>
              <p className="text-xs text-center text-muted-foreground break-all">{quizUrl}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RBAC Users Management */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-diva-blue" /> Quản lý Nhân sự & Phân quyền (RBAC)
            </CardTitle>
            <CardDescription>
              Cấp quyền Admin / Reviewer / HR Viewer và quản lý danh sách tính tỷ lệ Engagement
            </CardDescription>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">
            <Upload className="mr-2 h-4 w-4" /> Import Nhân sự (.xlsx)
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportUsers} />
          </label>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã NV</TableHead>
                <TableHead>Họ tên / Email</TableHead>
                <TableHead>Bộ phận / Khối</TableHead>
                <TableHead>Vai trò (Role)</TableHead>
                <TableHead>Kích hoạt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-bold">{u.employee_code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground">{u.email || 'Genba (không email)'}</div>
                  </TableCell>
                  <TableCell>
                    <div>{u.department}</div>
                    <Badge variant="outline" className="text-[11px]">{u.employee_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(r: UserRole) => handleRoleChange(u, r)}>
                      <SelectTrigger className="w-36 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">employee</SelectItem>
                        <SelectItem value="reviewer">reviewer</SelectItem>
                        <SelectItem value="hr_viewer">hr_viewer</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      onCheckedChange={(checked) => handleToggleActive(u, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Admin Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nhật ký Thao tác Quản trị (Audit Logs)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl border p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{log.action_type}</Badge>
                  <span className="font-semibold">{log.actor_email}</span>
                  <span className="text-muted-foreground">→ {log.target_id}</span>
                </div>
                <span className="text-muted-foreground font-mono">
                  {new Date(log.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
