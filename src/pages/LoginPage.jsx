import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (isAuthenticated) {
    navigate(location.state?.from || '/', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } else {
      navigate(location.state?.from || '/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 pattern-bg" dir="rtl">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <span className="w-16 h-16 rounded-2xl bg-brand/15 flex items-center justify-center text-3xl border border-brand/30 mx-auto mb-4">
            🌟
          </span>
          <h1 className="font-display text-2xl font-bold text-white">أبو حسني</h1>
          <p className="text-gold text-sm">Restaurant OS</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4 animate-fade-in-up">
          <h2 className="text-white font-bold text-lg font-display mb-2">تسجيل الدخول</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-light text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98] hover:shadow-[0_0_16px_rgba(255,107,53,0.35)]"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
