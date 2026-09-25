import { Routes, Route, Link } from 'react-router-dom'
import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import HomePage from './pages/HomePage'
import SongPage from './pages/SongPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import UploadPage from './pages/UploadPage'
import SystemCheck from './pages/SystemCheck'

function NotFound() {
  return (
    <main>
      <p>Page not found.</p>
      <Link to="/">Back to all songs</Link>
    </main>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/songs/:id" element={<SongPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="/check" element={<SystemCheck />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
