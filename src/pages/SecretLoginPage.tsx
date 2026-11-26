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
    setStatusMsg('Đã khôi phục dữ liệu mẫu (30 câu Excel + mẫu lượt thi + action logs) về ban đầu.')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại trang Quiz
          </Link>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300">
            <Lock className="mr-1 h-3 w-3" /> Secret Testing Gate
          </Badge>
        </div>

        <Card className="border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <DivaMascot pose="wink" size="sm" />
              <div>
                <CardTitle className="text-xl text-white">Cổng Đăng nhập Bí mật & Kiểm tra</CardTitle>
                <CardDescription className="text-neutral-400">
                  Dành riêng cho Admin, Reviewer, HR và kiểm thử nhanh toàn bộ Role
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!unlocked ? (
              <form onSubmit={handleUnlockGate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gate-code" className="text-neutral-200">
                    Nhập Mã cổng bí mật (Secret Gate Code)
                  </Label>
                  <Input
                    id="gate-code"
                    type="password"
                    value={gateInput}
                    onChange={(e) => setGateInput(e.target.value)}
                    placeholder="Nhập mã truy cập..."
                    className="bg-neutral-800 border-neutral-700 text-white"
                  />
                  <p className="text-xs text-neutral-400">
                    Mặc định cấu hình test: <code className="text-amber-300">{GATE_CODE}</code> (đổi được qua{' '}
                    <code>VITE_SECRET_GATE_CODE</code>).
                  </p>
                </div>

                {gateError && (
                  <Alert variant="destructive">
                    <AlertDescription>{gateError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-diva-red hover:bg-diva-red/90">
                  <KeyRound className="mr-2 h-4 w-4" /> Mở khóa Cổng Kiểm tra
                </Button>
              </form>
            ) : (
              <>
                {currentSession && (
                  <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-800/60 px-3.5 py-2.5 text-xs">
                    <span>
                      Đang đăng nhập: <strong>{currentSession.user.full_name}</strong> ({currentSession.user.role})
                    </span>
                    <div className="flex gap-2">
                      {currentSession.user.role !== 'employee' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/admin')}>
                          Vào Admin
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
                        Đăng xuất
                      </Button>
                    </div>
                  </div>
                )}

                <Tabs defaultValue={quizService.isUsingSupabase() ? 'supabase' : 'demo'}>
                  <TabsList className="grid w-full grid-cols-2 bg-neutral-800">
                    <TabsTrigger value="demo">Kiểm thử nhanh theo Role</TabsTrigger>
                    <TabsTrigger value="supabase">Supabase Auth (Production)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="demo" className="space-y-3 pt-2">
                    <p className="text-xs text-neutral-400">
                      Chọn 1 vai trò bên dưới để vào kiểm tra ngay giao diện thực tế, phân quyền RBAC và dữ liệu Action Logs:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Button
                        variant="outline"
                        className="h-auto justify-start border-neutral-700 bg-neutral-800/70 p-3 text-left text-white hover:bg-neutral-800"
                        onClick={() => handleQuickRoleLogin('admin')}
                      >
                        <ShieldCheck className="mr-2.5 h-5 w-5 text-diva-red shrink-0" />
                        <div>
                          <div className="font-bold">Admin (Toàn quyền)</div>
                          <div className="text-[11px] text-neutral-400">Dashboard, Câu hỏi, Action Logs, RBAC</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto justify-start border-neutral-700 bg-neutral-800/70 p-3 text-left text-white hover:bg-neutral-800"
                        onClick={() => handleQuickRoleLogin('reviewer')}
                      >
                        <UserCog className="mr-2.5 h-5 w-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold">Reviewer (Duyệt đề)</div>
                          <div className="text-[11px] text-neutral-400">Sửa/Duyệt câu hỏi, Import Excel</div>
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
                          <div className="text-[11px] text-neutral-400">Xem giải thưởng, % phòng ban, Export</div>
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
                          <div className="text-[11px] text-neutral-400">Làm Quiz & bị chặn nếu vào /admin</div>
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
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset dữ liệu Demo
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="supabase" className="space-y-3 pt-2">
                    {!quizService.isUsingSupabase() && (
                      <Alert variant="warning">
                        <AlertDescription>
                          Chưa phát hiện <code>VITE_SUPABASE_URL</code> trong file <code>.env</code>. Hiện web đang chạy chế độ Demo Local.
                        </AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleSupabaseLogin} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-email">Email Quản trị / HR / Reviewer</Label>
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
                        <Label htmlFor="sb-pass">Mật khẩu</Label>
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
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập qua Supabase Auth'}
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
