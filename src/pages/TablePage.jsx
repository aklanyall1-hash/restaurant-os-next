import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, RESTAURANT_ID } from '../lib/supabase'

export default function TablePage() {
  const { tableNumber } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [tableId, setTableId] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [step, setStep] = useState('menu') // 'menu' | 'cart' | 'success'
  const [orderNotes, setOrderNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [rest, cats, prods, tbl] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', RESTAURANT_ID).single(),
        supabase.from('categories').select('*').eq('restaurant_id', RESTAURANT_ID).eq('is_active', true).order('sort_order'),
        supabase.from('products').select('*').eq('restaurant_id', RESTAURANT_ID).eq('is_available', true).order('sort_order'),
        supabase.from('tables').select('*').eq('restaurant_id', RESTAURANT_ID).eq('table_number', tableNumber).single(),
      ])
      if (rest.data) setRestaurant(rest.data)
      if (cats.data) { setCategories(cats.data); setActiveCategory(cats.data[0]?.id) }
      if (prods.data) setProducts(prods.data)
      if (tbl.data) setTableId(tbl.data.id)
    }
    load()
  }, [tableNumber])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? {...i, qty: i.qty + 1} : i)
      return [...prev, { ...product, qty: 1, note: '' }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? {...i, qty: Math.max(0, i.qty + delta)} : i).filter(i => i.qty > 0))
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  const placeOrder = async () => {
    if (cart.length === 0 || !tableId) return
    setLoading(true)
    try {
      const orderNum = await supabase.rpc('generate_order_number', { restaurant_uuid: RESTAURANT_ID })
      const { data: order } = await supabase.from('orders').insert({
        restaurant_id: RESTAURANT_ID,
        table_id: tableId,
        order_number: orderNum.data,
        status: 'pending',
        total_amount: cartTotal,
        notes: orderNotes,
      }).select().single()

      if (order) {
        await supabase.from('order_items').insert(
          cart.map(i => ({
            order_id: order.id,
            product_id: i.id,
            product_name_ar: i.name_ar,
            product_image_url: i.image_url,
            quantity: i.qty,
            unit_price: i.price,
            total_price: i.price * i.qty,
            notes: i.note || null,
          }))
        )
        setStep('success')
        setCart([])
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products

  if (!restaurant) return (
    <div className="flex items-center justify-center h-screen bg-dark">
      <div className="text-brand text-2xl animate-pulse">جاري التحميل...</div>
    </div>
  )

  if (step === 'success') return (
    <div className="flex flex-col items-center justify-center h-screen bg-dark text-center px-6">
      <div className="text-7xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold text-white mb-3">تم إرسال طلبك!</h2>
      <p className="text-gray-400 mb-8">طلبك وصل للمطبخ وجاري التحضير</p>
      <button onClick={() => setStep('menu')} className="bg-brand text-white px-8 py-3 rounded-xl font-bold text-lg">
        طلب جديد
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark/95 backdrop-blur border-b border-border">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">{restaurant.name}</h1>
            <p className="text-gray-400 text-sm">طاولة {tableNumber}</p>
          </div>
          {step === 'menu' && cartCount > 0 && (
            <button onClick={() => setStep('cart')} className="relative bg-brand text-white px-5 py-2 rounded-xl font-bold">
              السلة
              <span className="absolute -top-2 -left-2 bg-white text-brand text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </button>
          )}
          {step === 'cart' && (
            <button onClick={() => setStep('menu')} className="text-gray-400 hover:text-white">
              ← العودة
            </button>
          )}
        </div>

        {/* Categories */}
        {step === 'menu' && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === c.id ? 'bg-brand text-white' : 'bg-white/10 text-gray-400'
                }`}
              >
                {c.icon} {c.name_ar}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu */}
      {step === 'menu' && (
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredProducts.map(p => {
            const cartItem = cart.find(i => i.id === p.id)
            return (
              <div key={p.id} className="glass rounded-xl overflow-hidden">
                <div className="h-28 bg-gradient-to-br from-brand/20 to-surface flex items-center justify-center">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🍽️</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-white font-medium text-sm mb-1">{p.name_ar}</div>
                  <div className="text-brand font-bold text-sm mb-2">{Number(p.price).toFixed(0)} ج.م</div>
                  {cartItem ? (
                    <div className="flex items-center justify-between">
                      <button onClick={() => updateQty(p.id, -1)} className="w-7 h-7 bg-brand/20 text-brand rounded-full font-bold text-lg leading-none">-</button>
                      <span className="text-white font-bold">{cartItem.qty}</span>
                      <button onClick={() => updateQty(p.id, 1)} className="w-7 h-7 bg-brand text-white rounded-full font-bold text-lg leading-none">+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(p)}
                      className="w-full bg-brand/20 hover:bg-brand text-brand hover:text-white text-sm py-1.5 rounded-lg transition-all font-medium"
                    >
                      + إضافة
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cart */}
      {step === 'cart' && (
        <div className="p-4 max-w-sm mx-auto">
          <h2 className="text-white font-bold text-xl mb-4">سلة الطلبات</h2>
          <div className="space-y-3 mb-4">
            {cart.map(item => (
              <div key={item.id} className="glass rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-medium">{item.name_ar}</span>
                  <span className="text-brand font-bold">{(item.price * item.qty).toFixed(0)} ج</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-brand/20 text-brand rounded-full font-bold">-</button>
                  <span className="text-white font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-brand text-white rounded-full font-bold">+</button>
                </div>
              </div>
            ))}
          </div>
          <textarea
            placeholder="ملاحظات على الطلب (اختياري)"
            value={orderNotes}
            onChange={e => setOrderNotes(e.target.value)}
            className="w-full bg-white/10 text-white placeholder-gray-500 border border-border rounded-xl p-3 mb-4 text-sm resize-none h-20 focus:outline-none focus:border-brand"
          />
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">الإجمالي</span>
              <span className="text-brand">{cartTotal.toFixed(2)} ج.م</span>
            </div>
          </div>
          <button
            onClick={placeOrder}
            disabled={loading}
            className="w-full bg-brand hover:bg-brand/80 text-white font-bold py-4 rounded-xl text-lg transition-all disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : '🛎️ أرسل الطلب'}
          </button>
        </div>
      )}
    </div>
  )
}
