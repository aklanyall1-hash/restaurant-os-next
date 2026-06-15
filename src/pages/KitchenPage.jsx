import { useEffect, useState } from 'react'
import { supabase, RESTAURANT_ID } from '../lib/supabase'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [newOrderIds, setNewOrderIds] = useState(new Set())

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label), order_items(*, products(name_ar, image_url))')
      .eq('restaurant_id', RESTAURANT_ID)
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase.channel('kitchen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setNewOrderIds(prev => new Set([...prev, payload.new.id]))
        setTimeout(() => {
          setNewOrderIds(prev => { const s = new Set(prev); s.delete(payload.new.id); return s })
        }, 5000)
        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const updateStatus = async (orderId, status) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
  }

  const statusConfig = {
    pending:   { label: 'جديد', next: 'preparing', nextLabel: '🔥 ابدأ التحضير', color: 'border-yellow-500' },
    preparing: { label: 'يُحضَّر', next: 'ready',    nextLabel: '✅ جاهز', color: 'border-blue-500' },
  }

  return (
    <div className="p-4 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">شاشة المطبخ 👨‍🍳</h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-green-400 text-sm">متصل - تحديث فوري</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <span className="text-6xl mb-4">✨</span>
          <p className="text-xl">لا توجد طلبات حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map(order => {
            const cfg = statusConfig[order.status]
            const isNew = newOrderIds.has(order.id)
            return (
              <div
                key={order.id}
                className={`glass rounded-xl border-2 ${cfg.color} ${isNew ? 'pulse-new' : ''} flex flex-col`}
              >
                {/* Header */}
                <div className={`p-3 border-b border-white/10 flex justify-between items-center`}>
                  <div>
                    <span className="text-white font-bold text-lg">#{order.order_number}</span>
                    {isNew && <span className="mr-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">جديد!</span>}
                  </div>
                  <span className="text-gray-400 text-sm">{order.tables?.label}</span>
                </div>

                {/* Items */}
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

                {/* Timer & Action */}
                <div className="p-3 border-t border-white/10">
                  <div className="text-gray-500 text-xs mb-2">
                    {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button
                    onClick={() => updateStatus(order.id, cfg.next)}
                    className="w-full bg-brand hover:bg-brand/80 text-white font-bold py-2 rounded-lg transition-all text-sm"
                  >
                    {cfg.nextLabel}
                  </button>
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="w-full mt-1 text-red-400 hover:bg-red-400/10 py-1 rounded-lg transition-all text-xs"
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
