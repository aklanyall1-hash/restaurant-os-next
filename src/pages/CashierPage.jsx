import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function CashierPage() {
  const { restaurantId, profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState([])

  const printReceipt = () => {
    if (!selected) return
    const restaurantName = profile?.restaurants?.name || 'المطعم'
    const itemsHtml = items.map(item => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc;font-size:13px;">
        <span>${item.product_name_ar} x${item.quantity}</span>
        <span>${Number(item.total_price).toFixed(2)}</span>
      </div>
    `).join('')

    const win = window.open('', '_blank', 'width=320,height=600')
    win.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة #${selected.order_number}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; width: 280px; margin: 0 auto; padding: 16px; }
            h2 { text-align: center; margin: 4px 0; }
            .center { text-align: center; }
            .total { display:flex; justify-content:space-between; font-weight:bold; font-size:16px; margin-top:10px; padding-top:8px; border-top:2px solid #000; }
            .meta { text-align:center; font-size:12px; color:#555; margin-bottom:10px; }
          </style>
        </head>
        <body>
          <h2>${restaurantName}</h2>
          <div class="meta">طاولة: ${selected.tables?.label || '-'} · #${selected.order_number}</div>
          <div class="meta">${new Date(selected.created_at).toLocaleString('ar-EG')}</div>
          ${itemsHtml}
          <div class="total"><span>الإجمالي</span><span>${Number(selected.total_amount).toFixed(2)} ج.م</span></div>
          <p class="center" style="margin-top:20px;font-size:12px;">شكراً لزيارتكم 🌟</p>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `)
    win.document.close()
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label)')
      .eq('restaurant_id', restaurantId)
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
    if (!restaurantId) return
    fetchOrders()
    const ch = supabase.channel('cashier')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetchOrders)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [restaurantId])

  const statusLabel = { ready: '🟢 جاهز', completed: '✅ مكتمل' }

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-64px)] pattern-bg">
      {/* Orders list */}
      <div className="w-72 flex-shrink-0 glass rounded-xl p-4 overflow-y-auto animate-fade-in-up">
        <h2 className="text-white font-bold text-lg mb-4 font-display">الطلبات الجاهزة 🧾</h2>
        {orders.filter(o => o.status === 'ready').length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">لا توجد طلبات جاهزة</p>
        )}
        <div className="space-y-2">
          {orders.filter(o => o.status === 'ready').map((o, i) => (
            <button
              key={o.id}
              onClick={() => selectOrder(o)}
              className={`w-full text-right p-3 rounded-lg transition-all duration-200 border stagger-item ${
                selected?.id === o.id
                  ? 'border-brand bg-brand/10 shadow-[0_0_0_1px_rgba(255,107,53,0.3)]'
                  : 'border-border bg-white/5 hover:border-brand/50 hover:bg-white/[0.07]'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-bold font-display">#{o.order_number}</span>
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
      <div className="flex-1 glass rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <span className="text-6xl mb-4">🧾</span>
            <p>اختر طلباً لعرض الفاتورة</p>
          </div>
        ) : (
          <div className="max-w-sm mx-auto animate-scale-in">
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-white mb-1 font-display">فاتورة</div>
              <div className="text-gray-400">#{selected.order_number} · {selected.tables?.label}</div>
            </div>

            <div className="space-y-3 mb-6">
              {items.map((item, i) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
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
                <span className="text-white font-display">الإجمالي</span>
                <span className="text-brand font-display">{Number(selected.total_amount).toFixed(2)} ج.م</span>
              </div>
            </div>

            {selected.status === 'ready' && (
              <>
                <button
                  onClick={printReceipt}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl mb-3 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  🖨️ طباعة الفاتورة
                </button>
                <button
                  onClick={completeOrder}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_20px_rgba(34,197,94,0.35)]"
                >
                  ✅ تم الدفع - إغلاق الطلب
                </button>
              </>
            )}
            {selected.status === 'completed' && (
              <div className="space-y-3">
                <button
                  onClick={printReceipt}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  🖨️ إعادة طباعة الفاتورة
                </button>
                <div className="text-center text-green-400 font-bold py-2">✅ تم إغلاق هذا الطلب</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
