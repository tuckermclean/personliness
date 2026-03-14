import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Assessment from './pages/Assessment'
import Results from './pages/Results'
import Figures from './pages/Figures'
import FigureDetail from './pages/FigureDetail'
import Compare from './pages/Compare'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/assessment" element={
          <PrivateRoute>
            <Assessment />
          </PrivateRoute>
        } />
        <Route path="/results" element={
          <PrivateRoute>
            <Results />
          </PrivateRoute>
        } />
        <Route path="/figures" element={<Figures />} />
        <Route path="/figures/:slug" element={<FigureDetail />} />
        <Route path="/compare/:slug" element={
          <PrivateRoute>
            <Compare />
          </PrivateRoute>
        } />
      </Routes>
    </Layout>
  )
}

export default App
