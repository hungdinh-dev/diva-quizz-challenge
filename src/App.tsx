import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from '@/pages/AdminPage'
import { QuizPage } from '@/pages/QuizPage'
import { SecretLoginPage } from '@/pages/SecretLoginPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuizPage />} />
        <Route path="/secret-login" element={<SecretLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
