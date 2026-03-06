import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginWithEmail, register } = useAuth()
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google'
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password)
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return }
        await register(name, email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(232,57,77,0.5)]">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-display text-3xl tracking-wider text-white">MANGAVERSE</span>
          </Link>
          <h1 className="font-display text-2xl text-white tracking-wide">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-text-muted text-sm font-body mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Join the community'}
          </p>
        </div>

        <div className="glass rounded-3xl p-8">

          {/* ── Google Button ── */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 mb-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-body text-sm rounded-xl transition-all disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-text-muted text-xs font-body">or continue with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <User size={15} className="text-text-muted" />
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-transparent text-sm text-text placeholder-text-muted outline-none flex-1 font-body" />
              </div>
            )}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Mail size={15} className="text-text-muted" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="bg-transparent text-sm text-text placeholder-text-muted outline-none flex-1 font-body" />
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Lock size={15} className="text-text-muted" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Password"
                className="bg-transparent text-sm text-text placeholder-text-muted outline-none flex-1 font-body" />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 rounded-xl px-4 py-3">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {mode === 'register' && (
              <p className="text-xs text-text-muted font-body text-center">
                💡 The first registered account automatically becomes <span className="text-amber-400">Admin</span>
              </p>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-body font-medium text-sm rounded-xl transition-all hover:shadow-[0_0_20px_rgba(232,57,77,0.4)] disabled:opacity-50">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <p className="text-center mt-5 text-sm font-body text-text-muted">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="text-primary hover:underline">
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
