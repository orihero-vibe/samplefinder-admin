import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import PasswordReset from './pages/PasswordReset'
import PasswordResetSuccess from './pages/PasswordResetSuccess'
import EmailConfirmation from './pages/EmailConfirmation'
import Dashboard from './pages/Dashboard/Dashboard'
import EventReviews from './pages/EventReviews/EventReviews'
import ClientsBrands from './pages/ClientsBrands/ClientsBrands'
import Users from './pages/Users/Users'
import Reports from './pages/Reports/Reports'
import PreviewReports from './pages/Reports/PreviewReports'
import Notifications from './pages/Notifications/Notifications'
import Trivia from './pages/Trivia/Trivia'
import TriviaDetails from './pages/Trivia/TriviaDetails'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/password-reset-success" element={<PasswordResetSuccess />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/event-reviews" element={<EventReviews />} />
        <Route path="/clients-brands" element={<ClientsBrands />} />
        <Route path="/app-users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/preview/:reportId" element={<PreviewReports />} />
        <Route path="/notification-settings" element={<Notifications />} />
        <Route path="/trivia" element={<Trivia />} />
        <Route path="/trivia/:triviaId" element={<TriviaDetails />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
