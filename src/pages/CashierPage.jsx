import { useEffect, useState } from 'react'
import { supabase, RESTAURANT_ID } from '../lib/supabase'

export default function CashierPage() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState([])

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label)')
      .eq('restaurant_id', RESTAURANT_ID)
      .in('status', ['ready', 'completed'])
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setOrders(data)
  }

  const selectOrder = async (order) => {
    setSelected(order)
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
    if (data) setItems(data)
  }

  const completeOrder = async () => {
    if (!selected) return
    await supabase.from('orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', selected.id)
    setSelected(null)
    setItems([])
    fetchOrders()
  }

  useEffect(() => {
    fetchOrders()
    const ch = supabase.channel('cashier')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const statusLabel = { ready: '🟢 جاهز', completed: '✅ مكتمل' }

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-64px)]">
      {/* Orders list */}
      <div className="w-72 flex-shrink-0 glass rounded-xl p-4 overflow-y-auto">
        <h2 className="text-white font-bold text-lg mb-4">الطلبات الجاهزة 🧾</h2>
        {orders.filter(o => o.status === 'ready').length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">لا توجد طلبات جاهزة</p>
        )}
        <div className="space-y-2">
          {orders.filter(o => o.status === 'ready').map(o => (
            <button
              key={o.id}
              onClick={() => selectOrder(o)}
              className={`w-full text-right p-3 rounded-lg transition-all border ${
                selected?.id === o.id
                  ? 'border-brand bg-brand/10'
                  : 'border-border bg-white/5 hover:border-brand/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">#{o.order_number}</span>
                <span className="text-green-400 text-xs">{statusLabel[o.status]}</span>
              </div>
              <div className="text-gray-400 text-sm mt-1">{o.tables?.label}</div>
              <div className="text-brand font-bold mt-1">{Number(o.total_amount).toFixed(2)} ج.م</div>
            </button>
          ))}
        </div>

        {/* Completed today */}
        <div className="mt-6">
          <h3 className="text-gray-500 text-sm mb-2">مكتملة اليوم</h3>
          {orders.filter(o => o.status === 'completed').map(o => (
            <button
              key={o.id}
              onClick={() => selectOrder(o)}
              className="w-full text-right p-2 rounded-lg bg-white/5 hover:bg-white/10 mb-1"
            >
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">#{o.order_number}</span>
                <span className="text-gray-500 text-sm">{Number(o.total_amount).toFixed(0)} ج</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Receipt view */}
      <div className="flex-1 glass rounded-xl p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <span className="text-6xl mb-4">🧾</span>
            <p>اختر طلباً لعرض الفاتورة</p>
          </div>
        ) : (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-white mb-1">فاتورة</div>
              <div className="text-gray-400">#{selected.order_number} · {selected.tables?.label}</div>
            </div>

            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white">{item.product_name_ar}</div>
                    {item.notes && <div className="text-yellow-400 text-xs">{item.notes}</div>}
                  </div>
                  <div className="text-left">
                    <div className="text-gray-400 text-sm">x{item.quantity}</div>
                    <div className="text-white font-bold">{Number(item.total_price).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 mb-6">
              <div className="flex justify-between text-xl font-bold">
                <span className="text-white">الإجمالي</span>
                <span className="text-brand">{Number(selected.total_amount).toFixed(2)} ج.م</span>
              </div>
            </div>

            {selected.status === 'ready' && (
              <button
                onClick={completeOrder}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg transition-all"
              >
                ✅ تم الدفع - إغلاق الطلب
              </button>
            )}
            {selected.status === 'completed' && (
              <div className="text-center text-green-400 font-bold py-4">✅ تم إغلاق هذا الطلب</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
