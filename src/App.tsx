import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QuizPage } from '@/pages/QuizPage'
import { I18nProvider } from '@/lib/i18n'

const AdminPage = lazy(() => import('@/pages/AdminPage').then((page) => ({ default: page.AdminPage })))
const SecretLoginPage = lazy(() => import('@/pages/SecretLoginPage').then((page) => ({ default: page.SecretLoginPage })))

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<QuizPage />} />
            <Route path="/secret-login" element={<SecretLoginPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default App
