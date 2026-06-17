import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const baseLinks = [
  { to: '/', label: 'الرئيسية', icon: '📊' },
  { to: '/kitchen', label: 'المطبخ', icon: '👨‍🍳' },
  { to: '/cashier', label: 'الكاشير', icon: '🧾' },
  { to: '/menu', label: 'المنيو', icon: '🍽️' },
  { to: '/settings', label: 'الإعدادات', icon: '⚙️' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const { profile, signOut, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const links = isSuperAdmin
    ? [...baseLinks, { to: '/admin', label: 'المشرف', icon: '🛡️' }]
    : baseLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 glass border-b border-border h-16 flex items-center px-4">
      <div className="flex items-center gap-2.5 mr-4">
        {profile?.restaurants?.logo_url ? (
          <img src={profile.restaurants.logo_url} alt="logo" className="w-9 h-9 rounded-xl object-cover border border-brand/30" />
        ) : (
          <span className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center text-xl border border-brand/30">
            🌟
          </span>
        )}
        <div className="leading-tight">
          <div className="font-display font-bold text-lg text-white">
            {profile?.restaurants?.name || 'أبو حسني'}
          </div>
          <div className="text-[10px] text-gold tracking-wide">
            {isSuperAdmin ? 'Super Admin' : 'Restaurant OS'}
          </div>
        </div>
      </div>
      <div className="flex gap-1 mr-auto">
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname === l.to
                ? 'bg-brand text-white shadow-[0_0_0_1px_rgba(255,107,53,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>
      <button
        onClick={handleSignOut}
        className="mr-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
      >
        خروج
      </button>
    </nav>
  )
}
