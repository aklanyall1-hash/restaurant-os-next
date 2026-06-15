import { useEffect, useState } from 'react'
import { supabase, RESTAURANT_ID } from '../lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, todayTotal: 0, todayOrders: 0 })
  const [recentOrders, setRecentOrders] = useState([])

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .eq('restaurant_id', RESTAURANT_ID)
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
      .eq('restaurant_id', RESTAURANT_ID)
      .order('created_at', { ascending: false })
      .limit(8)
    if (data) setRecentOrders(data)
  }

  useEffect(() => {
    fetchStats()
    fetchRecent()

    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchStats()
        fetchRecent()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const statusLabel = { pending: 'انتظار', preparing: 'يُحضَّر', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">لوحة التحكم</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'انتظار', value: stats.pending, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'يُحضَّر', value: stats.preparing, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'جاهز', value: stats.ready, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'طلبات اليوم', value: stats.todayOrders, color: 'text-brand', bg: 'bg-brand/10' },
          { label: 'مبيعات اليوم', value: `${stats.todayTotal.toFixed(0)} ج`, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map(s => (
          <div key={s.label} className={`glass rounded-xl p-4 ${s.bg}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">آخر الطلبات</h2>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لا توجد طلبات بعد</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
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
