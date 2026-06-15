import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Counter from '../components/Counter'

export default function DashboardPage() {
  const { restaurantId } = useAuth()
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, todayTotal: 0, todayOrders: 0 })
  const [recentOrders, setRecentOrders] = useState([])

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today)

    if (data) {
      setStats({
        pending: data.filter(o => o.status === 'pending').length,
        preparing: data.filter(o => o.status === 'preparing').length,
        ready: data.filter(o => o.status === 'ready').length,
        todayOrders: data.length,
        todayTotal: data.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount), 0),
      })
    }
  }

  const fetchRecent = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(8)
    if (data) setRecentOrders(data)
  }

  useEffect(() => {
    if (!restaurantId) return
    fetchStats()
    fetchRecent()

    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchStats()
        fetchRecent()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [restaurantId])

  const statusLabel = { pending: 'انتظار', preparing: 'يُحضَّر', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' }

  return (
    <div className="p-6 max-w-6xl mx-auto pattern-bg">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="font-display text-3xl font-bold text-white mb-1">لوحة التحكم</h1>
        <p className="text-gray-500 text-sm">نظرة سريعة على أداء المطعم اليوم</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'انتظار', value: stats.pending, color: 'text-yellow-400', bg: 'bg-yellow-400/10', decimals: 0 },
          { label: 'يُحضَّر', value: stats.preparing, color: 'text-blue-300', bg: 'bg-blue-400/10', decimals: 0 },
          { label: 'جاهز', value: stats.ready, color: 'text-green-400', bg: 'bg-green-400/10', decimals: 0 },
          { label: 'طلبات اليوم', value: stats.todayOrders, color: 'text-brand', bg: 'bg-brand/10', decimals: 0 },
          { label: 'مبيعات اليوم', value: stats.todayTotal, color: 'text-gold', bg: 'bg-gold/10', decimals: 0, suffix: ' ج' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`glass rounded-xl p-4 ${s.bg} stagger-item hover:-translate-y-0.5`}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className={`text-3xl font-bold ${s.color} font-display`}>
              <Counter value={s.value} decimals={s.decimals} />
              {s.suffix || ''}
            </div>
            <div className="text-gray-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="glass rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
        <h2 className="text-lg font-bold text-white mb-4 font-display">آخر الطلبات</h2>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <span className="text-5xl mb-3 opacity-50">🍽️</span>
            <p>لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o, i) => (
              <div
                key={o.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg transition-colors hover:bg-white/10 stagger-item"
                style={{ animationDelay: `${400 + i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">#{o.order_number}</span>
                  <span className="text-gray-400 text-sm">{o.tables?.label || 'طاولة غير محددة'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{Number(o.total_amount).toFixed(0)} ج</span>
                  <span className={`status-${o.status} px-3 py-1 rounded-full text-xs font-medium`}>
                    {statusLabel[o.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
