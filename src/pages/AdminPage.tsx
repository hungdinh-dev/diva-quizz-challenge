import { LanguageToggle, useI18n } from '@/lib/i18n'
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Lock,
  LogOut,
  RefreshCw,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { AdminActionsTab } from '@/components/admin/AdminActionsTab'
import { AdminDashboardTab } from '@/components/admin/AdminDashboardTab'
import { AdminQuestionsTab } from '@/components/admin/AdminQuestionsTab'
import { AdminParticipationTab } from '@/components/admin/AdminParticipationTab'
import { AdminSettingsTab } from '@/components/admin/AdminSettingsTab'
import { DivaMascot } from '@/components/diva/DivaMascot'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { getActiveSession, quizService, setActiveSession } from '@/services/quizService'
import type {
  AdminAuditLog,
  Campaign,
  QuestionItem,
  QuizActionEvent,
  QuizAttempt,
  UserProfile,
} from '@/types/quiz'

export const AdminPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const session = getActiveSession()
  const user = session?.mode === (quizService.isUsingSupabase() ? 'supabase' : 'demo') &&
    (quizService.isUsingSupabase() || quizService.isDemoAvailable()) ? session.user : undefined

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [actionLogs, setActionLogs] = useState<QuizActionEvent[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const snap = await quizService.getAdminSnapshot()
      setUsers(snap.users)
      setCampaigns(snap.campaigns)
      setQuestions(snap.questions)
      setAttempts(snap.attempts)
      setActionLogs(snap.actionLogs)
      setAuditLogs(snap.auditLogs)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu quản trị.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || user.role === 'employee') return
    loadSnapshot()

    const client = supabase
    if (quizService.isUsingSupabase() && client) {
      const channel = client
        .channel('admin-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, () => {
          loadSnapshot()
        })
        .subscribe()
      return () => {
        client.removeChannel(channel)
      }
    }
  }, [user?.id, user?.role, loadSnapshot])

  // RBAC Guard
  if (!user || user.role === 'employee') {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle>{t("403 — Không có quyền truy cập", "403 — Access denied")}</CardTitle>
            <CardDescription>
              {user
                ? `Tài khoản "${user.full_name}" đang ở vai trò Employee nên bị chặn vào cổng quản trị.`
                : t("Vui lòng đăng nhập qua Cổng Bí mật với vai trò Admin, Reviewer hoặc HR.", "Sign in through the admin portal as an Admin, Reviewer or HR user.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild variant="outline">
              <Link to="/">{t("Về trang làm Quiz", "Back to the survey")}</Link>
            </Button>
            <Button asChild>
              <Link to="/secret-login">
                <Lock className="mr-1.5 h-4 w-4" /> {t("Cổng Đăng nhập Bí mật", "Admin sign-in")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canOverview = user.role === 'admin' || user.role === 'hr_viewer'
  const canQuestions = user.role === 'admin' || user.role === 'reviewer'
  const canActions = user.role === 'admin' || user.role === 'hr_viewer'
  const canSettings = user.role === 'admin'

  const defaultTab = canOverview ? (quizService.isUsingSupabase() ? 'participation' : 'overview') : 'questions'
  const actorEmail = user.email || user.employee_code

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DivaMascot pose="presenting" size="sm" className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-extrabold text-diva-ink">
                  DiVA Vision Admin Portal
                </h1>
                <Badge variant={quizService.isUsingSupabase() ? 'success' : 'warning'}>
                  {quizService.isUsingSupabase() ? 'Supabase Live' : 'Demo Local Mode'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {user.full_name} • Role: <strong className="uppercase">{user.role}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
            <Button variant="outline" size="sm" onClick={loadSnapshot} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t("Làm mới", "Refresh")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/">{t('Xem trang khảo sát', 'Open survey')}</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveSession(null)
                navigate('/secret-login')
              }}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t("Đăng xuất", "Sign out")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-neutral-200/70 p-1">
            {canOverview && quizService.isUsingSupabase() && (
              <TabsTrigger value="participation" className="gap-1.5">
                <Users className="h-4 w-4" /> {t("Theo dõi nhân sự", "Participation")}
              </TabsTrigger>
            )}
            {canOverview && (
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> {t("Tổng quan & Giải thưởng", "Overview & awards")}
              </TabsTrigger>
            )}
            {canQuestions && (
              <TabsTrigger value="questions" className="gap-1.5">
                <BookOpenCheck className="h-4 w-4" /> {t("Ngân hàng Câu hỏi", "Question bank")}
              </TabsTrigger>
            )}
            {canActions && (
              <TabsTrigger value="actions" className="gap-1.5">
                <Activity className="h-4 w-4" /> {t("Nhật ký làm bài", "Attempt logs")}
              </TabsTrigger>
            )}
            {canSettings && (
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="h-4 w-4" /> {t("Chiến dịch & RBAC", "Campaign & access")}
              </TabsTrigger>
            )}
          </TabsList>

          {canOverview && quizService.isUsingSupabase() && (
            <TabsContent value="participation">
              <AdminParticipationTab campaigns={campaigns} canImport={canSettings} />
            </TabsContent>
          )}

          {canOverview && (
            <TabsContent value="overview">
              <AdminDashboardTab users={users} attempts={attempts} actionLogs={actionLogs} />
            </TabsContent>
          )}

          {canQuestions && (
            <TabsContent value="questions">
              <AdminQuestionsTab questions={questions} actorEmail={actorEmail} onRefresh={loadSnapshot} />
            </TabsContent>
          )}

          {canActions && (
            <TabsContent value="actions">
              <AdminActionsTab
                attempts={attempts}
                actionLogs={actionLogs}
                userRole={user.role}
                actorEmail={actorEmail}
                onRefresh={loadSnapshot}
              />
            </TabsContent>
          )}

          {canSettings && (
            <TabsContent value="settings">
              <AdminSettingsTab
                campaigns={campaigns}
                users={users}
                auditLogs={auditLogs}
                actorEmail={actorEmail}
                onRefresh={loadSnapshot}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
