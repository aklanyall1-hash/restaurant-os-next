import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, restaurantId, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">🍽️</span>
          <div className="text-brand text-xl font-display shimmer-text animate-shimmer">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // User is authenticated but not linked to any restaurant yet (and not super admin)
  if (!restaurantId && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark text-center px-6" dir="rtl">
        <div>
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-white font-bold text-xl mb-2 font-display">حسابك قيد المراجعة</h2>
          <p className="text-gray-400">لم يتم ربط حسابك بمطعم بعد. تواصل مع الدعم.</p>
        </div>
      </div>
    )
  }

  return children
}
