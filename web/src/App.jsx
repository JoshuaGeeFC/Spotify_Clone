import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SongPage from './pages/SongPage'
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
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/songs/:id" element={<SongPage />} />
      <Route path="/check" element={<SystemCheck />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
