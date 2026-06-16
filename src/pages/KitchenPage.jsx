import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// صوت تنبيه بسيط بدون ملفات خارجية
function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const beep = (freq, start, dur) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = freq
      g.gain.setValueAtTime(0.3, ctx.currentTime + start)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + dur + 0.05)
    }
    beep(880, 0, 0.15); beep(1100, 0.2, 0.15); beep(880, 0.4, 0.3)
  } catch(e) {}
}

function OrderTimer({ createdAt }) {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const calc = () => setMins(Math.floor((Date.now() - new Date(createdAt)) / 60000))
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [createdAt])
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      mins >= 15 ? 'bg-red-500/20 text-red-400' :
      mins >= 8  ? 'bg-yellow-500/20 text-yellow-400' :
                   'bg-green-500/20 text-green-400'
    }`}>⏱ {mins} د</span>
  )
}

export default function KitchenPage() {
  const { restaurantId } = useAuth()
  const [orders, setOrders] = useState([])
  const [newOrderIds, setNewOrderIds] = useState(new Set())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const soundRef = useRef(soundEnabled)
  soundRef.current = soundEnabled

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label), order_items(*, products(name_ar, image_url))')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
  }

  useEffect(() => {
    if (!restaurantId) return
    fetchOrders()

    const channel = supabase.channel('kitchen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
        if (soundRef.current) playAlert()
        setNewOrderIds(prev => new Set([...prev, payload.new.id]))
        setTimeout(() => {
          setNewOrderIds(prev => { const s = new Set(prev); s.delete(payload.new.id); return s })
        }, 8000)
        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetchOrders)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [restaurantId])

  const updateStatus = async (orderId, status) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
  }

  const statusConfig = {
    pending:   { label: 'جديد', next: 'preparing', nextLabel: '🔥 ابدأ التحضير', color: 'border-yellow-500' },
    preparing: { label: 'يُحضَّر', next: 'ready',    nextLabel: '✅ جاهز', color: 'border-blue-500' },
  }

  return (
    <div className="p-4 min-h-screen pattern-bg">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">شاشة المطبخ 👨‍🍳</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} طلب قيد التنفيذ</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSoundEnabled(p => !p); if (!soundEnabled) playAlert() }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${
              soundEnabled
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-white/5 border-border text-gray-500'
            }`}
          >
            {soundEnabled ? '🔔 صوت شغال' : '🔕 صوت مطفي'}
          </button>
          <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-sm">متصل</span>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-fade-in-up">
          <span className="text-6xl mb-4">✨</span>
          <p className="text-xl">لا توجد طلبات حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order, i) => {
            const cfg = statusConfig[order.status]
            const isNew = newOrderIds.has(order.id)
            return (
              <div
                key={order.id}
                className={`glass rounded-xl border-2 ${cfg.color} ${isNew ? 'pulse-new' : ''} flex flex-col stagger-item`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="p-3 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg font-display">#{order.order_number}</span>
                    {isNew && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold animate-pulse">جديد!</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderTimer createdAt={order.created_at} />
                    <span className="text-gray-400 text-sm">{order.tables?.label}</span>
                  </div>
                </div>

                <div className="p-3 flex-1 space-y-2">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                      <span className="bg-brand text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-white text-sm">{item.product_name_ar}</span>
                      {item.notes && <span className="text-yellow-400 text-xs mr-auto">⚠️ {item.notes}</span>}
                    </div>
                  ))}
                  {order.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-yellow-400 text-sm">
                      📝 {order.notes}
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-white/10">
                  <button
                    onClick={() => updateStatus(order.id, cfg.next)}
                    className="w-full bg-brand hover:bg-brand-light text-white font-bold py-2.5 rounded-lg transition-all duration-200 text-sm hover:shadow-[0_0_16px_rgba(255,107,53,0.4)] active:scale-[0.98]"
                  >
                    {cfg.nextLabel}
                  </button>
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="w-full mt-1 text-red-400 hover:bg-red-400/10 py-1 rounded-lg transition-all duration-200 text-xs"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
