import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// AudioContext واحد ثابت لكل الصفحة، بدل ما نعمل واحد جديد كل نغمة
let sharedAudioCtx = null
function getAudioCtx() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedAudioCtx
}

// بعض المتصفحات (خصوصاً على الموبايل/التابلت) بترجّع الـ AudioContext لوضع
// "suspended" تلقائياً لو فاتت فترة بدون تفاعل مباشر من المستخدم، حتى لو
// كان شغال قبل كده. الحل: نحاول نعمل resume بشكل متكرر طول ما صفحة
// المطبخ مفتوحة، عشان الـ context يفضل جاهز لحظة ما يجي طلب جديد فعلي.
function startAudioKeepAlive() {
  const tick = () => {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  }
  tick()
  return setInterval(tick, 3000)
}

async function playAlert(onError) {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (ctx.state !== 'running') {
      onError?.(`الصوت محجوب من المتصفح (الحالة: ${ctx.state})`)
      return
    }
    const beep = (freq, start, dur) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start)
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + dur + 0.05)
    }
    beep(880, 0, 0.15); beep(1100, 0.2, 0.15); beep(880, 0.4, 0.3)
  } catch(e) {
    console.error('Audio alert failed:', e)
    onError?.(e.message || 'خطأ غير معروف في تشغيل الصوت')
  }
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
  const { restaurantId, stationId, canSeeAllStations } = useAuth()
  const [orders, setOrders] = useState([])
  const [stations, setStations] = useState([])
  const [activeStation, setActiveStation] = useState('all')
  const [newOrderIds, setNewOrderIds] = useState(new Set())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [audioError, setAudioError] = useState('')
  const [audioActivated, setAudioActivated] = useState(false)
  const soundRef = useRef(soundEnabled)
  soundRef.current = soundEnabled
  const keepAliveRef = useRef(null)

  useEffect(() => {
    return () => { if (keepAliveRef.current) clearInterval(keepAliveRef.current) }
  }, [])

  const fetchStations = async () => {
    const { data } = await supabase.from('stations').select('*').eq('restaurant_id', restaurantId).eq('type', 'kitchen').order('sort_order')
    if (data) setStations(data)
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label), order_items(*, products(name_ar, image_url), stations(name))')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
  }

  useEffect(() => {
    if (!restaurantId) return
    // staff with a single station start filtered to it; owners/admins see all
    if (!canSeeAllStations && stationId) setActiveStation(stationId)
    fetchStations()
    fetchOrders()

    const channel = supabase.channel('kitchen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
        if (soundRef.current) playAlert(setAudioError)
        setNewOrderIds(prev => new Set([...prev, payload.new.id]))
        setTimeout(() => {
          setNewOrderIds(prev => { const s = new Set(prev); s.delete(payload.new.id); return s })
        }, 8000)
        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchOrders)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [restaurantId])

  // Update a single item's status (per-station prep tracking)
  const updateItemStatus = async (itemId, status) => {
    await supabase.from('order_items').update({ status }).eq('id', itemId)
    fetchOrders()
    checkAndAdvanceOrder(itemId)
  }

  // When all items of an order reach 'ready', auto-advance the order itself.
  // Never touch an order that's already completed/cancelled - that's a final
  // state set by the cashier, and a late kitchen update shouldn't reopen it.
  const checkAndAdvanceOrder = async (itemId) => {
    const { data: item } = await supabase.from('order_items').select('order_id').eq('id', itemId).single()
    if (!item) return
    const { data: orderRow } = await supabase.from('orders').select('status').eq('id', item.order_id).single()
    if (!orderRow || orderRow.status === 'completed' || orderRow.status === 'cancelled') return

    const { data: items } = await supabase.from('order_items').select('status').eq('order_id', item.order_id)
    if (items && items.every(i => i.status === 'ready')) {
      await supabase.from('orders').update({ status: 'ready' }).eq('id', item.order_id)
    } else if (items && items.some(i => i.status === 'preparing' || i.status === 'ready')) {
      await supabase.from('orders').update({ status: 'preparing' }).eq('id', item.order_id)
    }
  }

  const itemStatusConfig = {
    pending:   { label: 'جديد', next: 'preparing', nextLabel: '🔥 بدء', color: 'border-r-yellow-500' },
    preparing: { label: 'يُحضَّر', next: 'ready', nextLabel: '✅ جاهز', color: 'border-r-blue-500' },
    ready:     { label: 'جاهز', next: null, nextLabel: null, color: 'border-r-green-500' },
  }

  // Filter: which items does THIS view care about?
  const filterItems = (items) => {
    if (activeStation === 'all') return items
    return items.filter(it => it.station_id === activeStation || !it.station_id)
  }

  // Only show orders that still have at least one relevant pending/preparing item
  const visibleOrders = orders
    .map(o => ({ ...o, order_items: filterItems(o.order_items || []) }))
    .filter(o => o.order_items.some(it => it.status !== 'ready'))

  return (
    <div className="p-4 min-h-screen pattern-bg">
      <div className="flex items-center justify-between mb-4 animate-fade-in-up flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">شاشة المطبخ 👨‍🍳</h1>
          <p className="text-gray-500 text-sm mt-1">{visibleOrders.length} طلب قيد التنفيذ</p>
          {!audioActivated && (
            <p className="text-yellow-400 text-xs mt-1">👆 دوس على "اختبار الصوت" مرة واحدة عند بدء الشيفت لتفعيل التنبيهات</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              const next = !soundEnabled
              setSoundEnabled(next)
              playAlert(setAudioError)
              // أول لمسة من المستخدم على الزرار = نقدر نبدأ الـ keep-alive
              // اللي يحافظ على الـ AudioContext جاهز طول ما الصفحة مفتوحة
              if (!keepAliveRef.current) {
                keepAliveRef.current = startAudioKeepAlive()
                setAudioActivated(true)
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${
              soundEnabled
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-white/5 border-border text-gray-500'
            }`}
          >
            {soundEnabled ? '🔔 صوت شغال' : '🔕 صوت مطفي'}
          </button>
          <button
            onClick={() => {
              setAudioError('')
              playAlert(setAudioError)
              if (!keepAliveRef.current) { keepAliveRef.current = startAudioKeepAlive(); setAudioActivated(true) }
            }}
            className="px-3 py-1.5 rounded-full border border-border text-gray-400 text-sm hover:text-white hover:border-brand/40 transition-all"
          >
            🔊 اختبار الصوت
          </button>
          <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-sm">متصل</span>
          </div>
        </div>
        {audioError && (
          <div className="w-full mt-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-2">
            ⚠️ {audioError} — تأكد إن صوت الجهاز/المتصفح مش على Silent أو Mute.
          </div>
        )}
      </div>

      {/* Station filter tabs - only meaningful with 2+ stations */}
      {stations.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          <button
            onClick={() => setActiveStation('all')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeStation === 'all' ? 'bg-brand text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
            }`}
          >
            الكل
          </button>
          {stations.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveStation(s.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeStation === s.id ? 'bg-brand text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-fade-in-up">
          <span className="text-6xl mb-4">✨</span>
          <p className="text-xl">لا توجد طلبات حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleOrders.map((order, i) => {
            const isNew = newOrderIds.has(order.id)
            return (
              <div
                key={order.id}
                className={`glass rounded-xl border-2 border-white/10 ${isNew ? 'pulse-new' : ''} flex flex-col stagger-item`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="p-3 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg font-display">#{order.order_number}</span>
                    {isNew && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold animate-pulse">جديد!</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderTimer createdAt={order.created_at} />
                    <span className="text-gray-400 text-sm">{order.tables?.label}{order.customer_name && ` · ${order.customer_name}`}</span>
                  </div>
                </div>

                <div className="p-3 flex-1 space-y-2">
                  {order.order_items?.map(item => {
                    const cfg = itemStatusConfig[item.status || 'pending']
                    return (
                      <div key={item.id} className={`flex items-center gap-2 bg-white/5 rounded-lg p-2 border-r-2 ${cfg.color}`}>
                        <span className="bg-brand text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm truncate">{item.product_name_ar}</div>
                          {item.notes && <div className="text-yellow-400 text-xs">⚠️ {item.notes}</div>}
                        </div>
                        {cfg.next && (
                          <button
                            onClick={() => updateItemStatus(item.id, cfg.next)}
                            className="bg-brand hover:bg-brand-light text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 flex-shrink-0"
                          >
                            {cfg.nextLabel}
                          </button>
                        )}
                        {!cfg.next && (
                          <span className="text-green-400 text-xs flex-shrink-0">✅</span>
                        )}
                      </div>
                    )
                  })}
                  {order.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-yellow-400 text-sm">
                      📝 {order.notes}
                    </div>
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
