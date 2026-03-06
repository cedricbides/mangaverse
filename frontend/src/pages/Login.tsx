import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginWithEmail, register } = useAuth()
  const navigate = useNavigate()

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
