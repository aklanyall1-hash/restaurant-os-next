import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'الرئيسية', icon: '📊' },
  { to: '/kitchen', label: 'المطبخ', icon: '👨‍🍳' },
  { to: '/cashier', label: 'الكاشير', icon: '🧾' },
  { to: '/menu', label: 'المنيو', icon: '🍽️' },
]

export default function NavBar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 glass border-b border-border h-16 flex items-center px-4">
      <div className="flex items-center gap-2 mr-4">
        <span className="text-2xl">🌟</span>
        <span className="font-bold text-lg text-white">Restaurant OS</span>
      </div>
      <div className="flex gap-1 mr-auto">
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              pathname === l.to
                ? 'bg-brand text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
