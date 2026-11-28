import { LanguageToggle, useI18n } from '@/lib/i18n'
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, Lock, RotateCcw, ShieldCheck, UserCog } from 'lucide-react'
import { DivaMascot } from '@/components/diva/DivaMascot'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loadDemoDb } from '@/services/demoStore'
import { getActiveSession, quizService, setActiveSession } from '@/services/quizService'
import type { UserRole } from '@/types/quiz'

const GATE_CODE = (import.meta.env.VITE_SECRET_GATE_CODE as string | undefined) || 'DIVA2035'
const GATE_UNLOCK_KEY = 'diva_secret_gate_unlocked_v1'

export const SecretLoginPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState<boolean>(
    () => sessionStorage.getItem(GATE_UNLOCK_KEY) === 'true'
  )
  const [gateInput, setGateInput] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const currentSession = getActiveSession()

  const handleUnlockGate = (e: React.FormEvent) => {
    e.preventDefault()
    if (gateInput.trim().toUpperCase() === GATE_CODE.toUpperCase()) {
      sessionStorage.setItem(GATE_UNLOCK_KEY, 'true')
      setUnlocked(true)
      setGateError(null)
    } else {
      setGateError('Mã truy cập bí mật chưa đúng (mặc định kiểm thử: DIVA2035).')
    }
  }

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoading(true)
    try {
      const sess = await quizService.loginWithSupabase(email, password)
      if (sess.user.role === 'employee') navigate('/')
      else navigate('/admin')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickRoleLogin = (role: UserRole) => {
    if (!quizService.isDemoAvailable()) return
    const db = loadDemoDb()
    const target = db.users.find((u) => u.role === role)
    if (!target) return
    setActiveSession({
      mode: 'demo',
      user: target,
      loggedInAt: new Date().toISOString(),
    })
    if (role === 'employee') {
      navigate('/')
    } else {
      navigate('/admin')
    }
  }

  const handleResetDemo = () => {
    quizService.resetDemo()
    setStatusMsg('Đã khôi phục bộ câu hỏi, lượt thi và nhật ký mẫu.')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {t("Quay lại trang Quiz", "Back to the survey")}
          </Link>
          <LanguageToggle />
        </div>

        <Card className="border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <DivaMascot pose="wink" size="sm" />
              <div>
                <CardTitle className="text-xl text-white">{t("Cổng Đăng nhập Bí mật & Kiểm tra", "Admin sign-in")}</CardTitle>
                <CardDescription className="text-neutral-400">
                  {t("Dành riêng cho Admin, Reviewer, HR và kiểm thử nhanh toàn bộ Role", "For Admins, Reviewers and HR")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!unlocked ? (
              <form onSubmit={handleUnlockGate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gate-code" className="text-neutral-200">
                    {t("Nhập Mã cổng bí mật (Secret Gate Code)", "Enter the portal access code")}
                  </Label>
                  <Input
                    id="gate-code"
                    type="password"
                    value={gateInput}
                    onChange={(e) => setGateInput(e.target.value)}
                    placeholder={t("Nhập mã truy cập...", "Access code")}
                    className="bg-neutral-800 border-neutral-700 text-white"
                  />
                  <p className="text-xs text-neutral-400">
                    {t("Mặc định cấu hình test:", "Default demo code:")} <code className="text-amber-300">{GATE_CODE}</code> {t("(đổi được qua", "(configurable via")}{' '}
                    <code>VITE_SECRET_GATE_CODE</code>).
                  </p>
                </div>

                {gateError && (
                  <Alert variant="destructive">
                    <AlertDescription>{gateError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-diva-red hover:bg-diva-red/90">
                  <KeyRound className="mr-2 h-4 w-4" /> {t("Mở khóa Cổng Kiểm tra", "Unlock admin portal")}
                </Button>
              </form>
            ) : (
              <>
                {currentSession && (
                  <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-800/60 px-3.5 py-2.5 text-xs">
                    <span>
                      {t("Đang đăng nhập:", "Signed in as:")} <strong>{currentSession.user.full_name}</strong> ({currentSession.user.role})
                    </span>
                    <div className="flex gap-2">
                      {currentSession.user.role !== 'employee' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/admin')}>
                          {t("Vào Admin", "Open admin portal")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-neutral-300"
                        onClick={() => {
                          setActiveSession(null)
                          setStatusMsg('Đã đăng xuất phiên hiện tại.')
                        }}
                      >
                        {t("Đăng xuất", "Sign out")}
                      </Button>
                    </div>
                  </div>
                )}

                <Tabs defaultValue={quizService.isDemoAvailable() ? 'demo' : 'supabase'}>
                  {quizService.isDemoAvailable() && <TabsList className="grid w-full grid-cols-2 bg-neutral-800">
                    <TabsTrigger value="demo">{t("Kiểm thử nhanh theo Role", "Demo roles")}</TabsTrigger>
                    <TabsTrigger value="supabase">Supabase Auth</TabsTrigger>
                  </TabsList>}

                  <TabsContent value="demo" className="space-y-3 pt-2">
                    <p className="text-xs text-neutral-400">
                      {t("Chọn 1 vai trò bên dưới để vào kiểm tra ngay giao diện thực tế, phân quyền RBAC và dữ liệu Action Logs:", "Choose a role to preview its interface and access.")}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Button
                        variant="outline"
                        className="h-auto justify-start border-neutral-700 bg-neutral-800/70 p-3 text-left text-white hover:bg-neutral-800"
                        onClick={() => handleQuickRoleLogin('admin')}
                      >
                        <ShieldCheck className="mr-2.5 h-5 w-5 text-diva-red shrink-0" />
                        <div>
                          <div className="font-bold">{t("Admin (Toàn quyền)", "Admin (full access)")}</div>
                          <div className="text-[11px] text-neutral-400">{t("Dashboard, Câu hỏi, Action Logs, RBAC", "Dashboard, questions, logs and access")}</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto justify-start border-neutral-700 bg-neutral-800/70 p-3 text-left text-white hover:bg-neutral-800"
                        onClick={() => handleQuickRoleLogin('reviewer')}
                      >
                        <UserCog className="mr-2.5 h-5 w-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold">{t("Reviewer (Duyệt đề)", "Reviewer (question review)")}</div>
                          <div className="text-[11px] text-neutral-400">{t("Sửa/Duyệt câu hỏi, Import Excel", "Edit and review questions")}</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto justify-start border-neutral-700 bg-neutral-800/70 p-3 text-left text-white hover:bg-neutral-800"
                        onClick={() => handleQuickRoleLogin('hr_viewer')}
                      >
                        <UserCog className="mr-2.5 h-5 w-5 text-sky-400 shrink-0" />
                        <div>
                          <div className="font-bold">HR / Manager</div>
                          <div className="text-[11px] text-neutral-400">{t("Xem giải thưởng, % phòng ban, Export", "View awards, department participation and exports")}</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto justify-start border-neutral-700 bg-neutral-800/70 p-3 text-left text-white hover:bg-neutral-800"
                        onClick={() => handleQuickRoleLogin('employee')}
                      >
                        <UserCog className="mr-2.5 h-5 w-5 text-diva-green shrink-0" />
                        <div>
                          <div className="font-bold">Employee (Genba)</div>
                          <div className="text-[11px] text-neutral-400">{t("Làm Quiz & bị chặn nếu vào /admin", "Take the survey")}</div>
                        </div>
                      </Button>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-neutral-400 hover:text-white"
                        onClick={handleResetDemo}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t("Reset dữ liệu Demo", "Reset demo data")}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="supabase" className="space-y-3 pt-2">
                    {!quizService.isUsingSupabase() && (
                      <Alert variant="warning">
                        <AlertDescription>
                          {t("Chưa cấu hình", "Missing configuration for")} <code>VITE_SUPABASE_URL</code> {t("và", "and")} <code>VITE_SUPABASE_ANON_KEY</code>.
                        </AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleSupabaseLogin} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-email">{t("Email Quản trị / HR / Reviewer", "Admin, HR or Reviewer email")}</Label>
                        <Input
                          id="sb-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@company.com"
                          className="bg-neutral-800 border-neutral-700 text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-pass">{t("Mật khẩu", "Password")}</Label>
                        <Input
                          id="sb-pass"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-neutral-800 border-neutral-700 text-white"
                        />
                      </div>

                      {loginError && (
                        <Alert variant="destructive">
                          <AlertDescription>{loginError}</AlertDescription>
                        </Alert>
                      )}

                      <Button type="submit" disabled={loading} className="w-full bg-diva-red hover:bg-diva-red/90">
                        {loading ? t("Đang đăng nhập...", "Signing in…") : t("Đăng nhập qua Supabase Auth", "Sign in with Supabase")}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {statusMsg && (
                  <Alert variant="success">
                    <AlertDescription>{statusMsg}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
